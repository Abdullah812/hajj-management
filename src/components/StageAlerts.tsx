import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Alert } from '../types/alerts'
import { AlertDisplay } from './AlertDisplay'

export function StageAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
    
    // الاشتراك في التنبيهات الجديدة
    const subscription = supabase
      .channel('stage_alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stage_alerts' },
        (payload) => {
          setAlerts(prev => [payload.new as Alert, ...prev])
        }
      )
      .subscribe()

    // تحديث كل دقيقة
    const interval = setInterval(fetchAlerts, 60000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  async function fetchAlerts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('stage_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleResolveAlert(alertId: number) {
    try {
      await supabase
        .from('stage_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId)

      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        جاري تحميل التنبيهات...
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        لا توجد تنبيهات حالياً
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {alerts.map(alert => (
        <AlertDisplay
          key={alert.id}
          alert={alert}
          onResolve={handleResolveAlert}
        />
      ))}
    </div>
  )
} 