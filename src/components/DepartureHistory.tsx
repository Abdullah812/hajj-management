import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface DepartureRecord {
  id: number;
  center_id: number;
  batch_number: number;
  departed_count: number;
  departure_date: string;
  notes: string;
}

export function DepartureHistory({ centerId }: { centerId: number }) {
  const [history, setHistory] = useState<DepartureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDepartureHistory();
  }, [centerId]);

  async function loadDepartureHistory() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departure_history')
        .select('*')
        .eq('center_id', centerId)
        .order('departure_date', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('خطأ في تحميل السجلات:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-4">جاري تحميل السجلات...</div>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">سجل المغادرات</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">التاريخ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الدفعة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">العدد</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.map(record => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(record.departure_date).toLocaleString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.batch_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                    {record.departed_count} حاج
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 