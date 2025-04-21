import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Modal } from './Modal';

export function DepartureTracking() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useAuth();
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      const { data, error } = await supabase
        .from('departure_tracking')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      console.log('Records:', data); // للتحقق من البيانات
      setRecords(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ في تحميل السجلات');
    } finally {
      setLoading(false);
    }
  }

  function showDetails(record: any): void {
    setSelectedRecord(record);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {loading ? (
        <div className="text-center py-4">جاري التحميل...</div>
      ) : (
        <h2 className="text-xl font-bold mb-4">سجل تسجيل المغادرات</h2>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الوقت</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">المسجل</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الدور</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">معتمد من</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">المرحلة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">المركز</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">العدد</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الموقع</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">تفاصيل</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map(record => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(record.recorded_at).toLocaleString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.user?.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.user?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${record.user_role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                      record.user_role === 'manager' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'}`}>
                    {record.user_role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.approved_by?.full_name || 'لم يتم الاعتماد'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.stage_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.center_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.pilgrim_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => showDetails(record)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    عرض التفاصيل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* نافذة التفاصيل */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="تفاصيل التسجيل"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">معلومات الجهاز</h3>
              <p className="text-sm text-gray-500">{selectedRecord.device_info}</p>
            </div>
            <div>
              <h3 className="text-lg font-medium">ملاحظات</h3>
              <p className="text-sm text-gray-500">{selectedRecord.notes}</p>
            </div>
            {/* يمكن إضافة المزيد من التفاصيل هنا */}
          </div>
        )}
      </Modal>
    </div>
  );
} 