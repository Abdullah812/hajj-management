import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from '../types/alerts';
import { AlertDisplay } from '../components/AlertDisplay';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale/ar';

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    
    const subscription = supabase
      .channel('stage_alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stage_alerts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAlerts(prev => [payload.new as Alert, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAlerts(prev => prev.map(alert => 
              alert.id === (payload.new as Alert).id ? payload.new as Alert : alert
            ));
          } else if (payload.eventType === 'DELETE') {
            setAlerts(prev => prev.filter(alert => alert.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stage_alerts')
        .select(`
          *,
          stage:stage_id (
            name,
            pilgrim_group:pilgrim_group_id (
              nationality
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(alertId: number) {
    try {
      const { error } = await supabase
        .from('stage_alerts')
        .update({ is_resolved: true })
        .eq('id', alertId);

      if (error) throw error;
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">التنبيهات</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {alerts.length} تنبيه
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">جاري التحميل...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">لا توجد تنبيهات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <AlertDisplay
              key={alert.id}
              alert={alert}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
} 