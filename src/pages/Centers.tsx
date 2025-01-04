import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PlusIcon } from '@heroicons/react/24/outline'
import { CenterModal } from '../components/CenterModal'
import { toast } from 'react-hot-toast'

interface Stage {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  order: number;
}

interface Center {
  id: string;
  name: string;
  location: string;
  capacity: number;
  stage_id: string;
  stage?: Stage;
  pilgrims_count?: number;
  progress?: number;
  status: 'active' | 'inactive';
}

export function Centers() {
  const [centers, setCenters] = useState<Center[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCenter, setSelectedCenter] = useState<Center | undefined>()

  useEffect(() => {
    fetchCenters()
    fetchStages()
  }, [])

  async function fetchCenters() {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select(`
          *,
          stage:stages (
            id,
            name,
            start_date,
            end_date,
            status
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCenters(data || [])
    } catch (error) {
      console.error('Error fetching centers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStages() {
    try {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setStages(data || [])
    } catch (error) {
      console.error('Error fetching stages:', error)
    }
  }

  function handleEdit(center: Center) {
    setSelectedCenter(center)
    setShowModal(true)
  }

  async function handleDelete(centerId: string) {
    if (!window.confirm('هل أنت متأكد من حذف هذا المركز؟')) return;
    
    try {
      // جلب تفاصيل المستخدمين
      const { data: userProfiles, error: userProfilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('center_id', centerId);

      if (userProfilesError) throw userProfilesError;
      
      if (userProfiles && userProfiles.length > 0) {
        const usersMessage = userProfiles
          .map(p => `${p.full_name} (${p.email})`)
          .join('\n');
        
        toast.error(`لا يمكن حذف المركز لوجود المستخدمين التاليين:\n${usersMessage}`);
        return;
      }

      // محاولة حذف المركز
      const { error: deleteError } = await supabase
        .from('centers')
        .delete()
        .eq('id', centerId);

      if (deleteError) throw deleteError;

      setCenters(prev => prev.filter(center => center.id !== centerId));
      toast.success('تم حذف المركز بنجاح');

    } catch (error) {
      console.error('Error deleting center:', error);
      toast.error('حدث خطأ أثناء محاولة حذف المركز');
    }
  }

  function handleAddNew() {
    setSelectedCenter(undefined)
    setShowModal(true)
  }

  async function checkAndUpdateStages() {
    try {
      // جلب المراحل النشطة
      const { data: activeStages } = await supabase
        .from('stages')
        .select('*')
        .eq('status', 'active')

      for (const stage of activeStages || []) {
        // التحقق من انتهاء المرحلة
        if (new Date(stage.end_date) < new Date()) {
          // تحديث المرحلة الحالية إلى "مكتملة"
          await supabase
            .from('stages')
            .update({ status: 'completed' })
            .eq('id', stage.id)

          // جلب المرحلة التالية
          const { data: nextStage } = await supabase
            .from('stages')
            .select('*')
            .eq('status', 'upcoming')
            .order('start_date', { ascending: true })
            .limit(1)
            .single()

          if (nextStage) {
            // تحديث المرحلة التالية إلى "نشطة"
            await supabase
              .from('stages')
              .update({ status: 'active' })
              .eq('id', nextStage.id)

            // تحديث المراكز للمرحلة الجديدة
            await supabase
              .from('centers')
              .update({ stage_id: nextStage.id })
              .eq('stage_id', stage.id)
          }
        }
      }

      // إعادة تحميل البيانات
      await Promise.all([fetchCenters(), fetchStages()])
    } catch (error) {
      console.error('Error checking stages:', error)
    }
  }

  // إضافة الفحص الدوري
  useEffect(() => {
    checkAndUpdateStages() // فحص أولي
    const interval = setInterval(checkAndUpdateStages, 1000 * 60 * 60) // فحص كل ساعة
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">المراكز</h1>
        <button
          onClick={handleAddNew}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 ml-2" />
          إضافة مركز
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        </div>
      ) : centers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">لا توجد مراكز مضافة</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم المركز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الموقع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المرحلة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  السعة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {centers.map((center) => (
                <tr key={center.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {center.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {center.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {center.stage?.name || 'لا توجد مرحلة'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {center.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      center.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {center.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                      onClick={() => handleEdit(center)} 
                      className="text-primary-600 hover:text-primary-900 ml-4"
                    >
                      تحرير
                    </button>
                    <button 
                      onClick={() => handleDelete(center.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CenterModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        center={selectedCenter}
        stages={stages}
        onSuccess={fetchCenters}
      />
    </div>
  )
} 