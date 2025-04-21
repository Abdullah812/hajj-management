import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PlusIcon } from '@heroicons/react/24/outline'
import { CenterModal } from '../components/CenterModal'
import { toast } from 'react-hot-toast'
import { CenterRefillSettings } from '../components/CenterRefillSettings'
import { Dialog } from '@headlessui/react'

interface Stage {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  order: number;
}

interface Center {
  id: number;
  name: string;
  location: string;
  current_count: number;
  default_capacity: number;
  stage_id: number;
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
  const [showRefillSettings, setShowRefillSettings] = useState(false)
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null)
  const [selectedStage, setSelectedStage] = useState<number | null>(null)

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

  async function handleDelete(centerId: number) {
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

  function handleRefillSettings(center: Center) {
    console.log('فتح إعدادات التعبئة للمركز:', center);
    setSelectedCenterId(center.id);
    setShowRefillSettings(true);
  }

  // إضافة دالة التحقق من التعبئة التلقائية
  async function checkAndRefillCenters() {
    try {
      console.log('=== بدء فحص المراكز ===');
      
      const { data: centers, error } = await supabase
        .from('centers')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('خطأ في جلب المراكز:', error);
        return;
      }

      for (const center of centers || []) {
        console.log(`\nفحص المركز ${center.name}:`, {
          current_count: center.current_count,
          departed_pilgrims: center.departed_pilgrims,
          default_capacity: center.default_capacity,
          current_batch: center.current_batch
        });

        // تحقق من شروط التعبئة
        if (center.current_count === 0) {
          if (center.default_capacity === 0) {
            console.log(`⚠️ المركز ${center.name} ليس لديه سعة افتراضية!`);
            continue;
          }

          // التحقق من إعدادات التعبئة
          const { data: refillSettings } = await supabase
            .from('center_stage_refills')
            .select('*')
            .eq('center_id', center.id)
            .eq('stage_id', center.stage_id)
            .eq('should_refill', true)
            .single();

          if (!refillSettings) {
            console.log(`⚠️ المركز ${center.name} غير مفعل للتعبئة التلقائية!`);
            continue;
          }

          console.log(`🔄 بدء تعبئة المركز ${center.name}...`);
          
          // تحديث المركز
          const { error: updateError } = await supabase
            .from('centers')
            .update({ 
              current_count: center.default_capacity,
              departed_pilgrims: 0,
              current_batch: (center.current_batch || 1) + 1
            })
            .eq('id', center.id);

          if (updateError) {
            console.error('❌ خطأ في تحديث المركز:', updateError);
            continue;
          }

          // تحديث حالة التعبئة
          const { error: refillError } = await supabase
            .from('center_stage_refills')
            .update({ is_refilled: true })
            .eq('center_id', center.id)
            .eq('stage_id', center.stage_id);

          if (refillError) {
            console.error('❌ خطأ في تحديث حالة التعبئة:', refillError);
            continue;
          }

          toast.success(`تم تعبئة المركز ${center.name}`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ أثناء تعبئة المراكز');
    }
  }

  // إضافة useEffect لتشغيل الفحص كل دقيقة
  useEffect(() => {
    const interval = setInterval(checkAndRefillCenters, 60000); // كل دقيقة
    return () => clearInterval(interval);
  }, []);

  // إضافة مراقب للتغييرات في المراكز
  useEffect(() => {
    // الاشتراك في تحديثات المراكز
    const subscription = supabase
      .channel('centers_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'centers'
        },
        async (payload) => {
          const updatedCenter = payload.new;
          console.log('تم تحديث المركز:', updatedCenter);

          // إذا وصل المركز إلى الصفر
          if (updatedCenter.current_count === 0) {
            console.log('المركز وصل للصفر، جاري التحقق من إعدادات التعبئة');

            // التحقق من إعدادات التعبئة
            const { data: refillSettings } = await supabase
              .from('center_stage_refills')
              .select('*')
              .eq('center_id', updatedCenter.id)
              .eq('stage_id', updatedCenter.stage_id)
              .eq('should_refill', true)
              .single();

            if (refillSettings) {
              console.log('المركز مفعل للتعبئة التلقائية، جاري التعبئة');

              // تعبئة المركز
              const { error: updateError } = await supabase
                .from('centers')
                .update({
                  current_count: updatedCenter.default_capacity,
                  departed_pilgrims: 0
                })
                .eq('id', updatedCenter.id);

              if (!updateError) {
                console.log('تمت التعبئة بنجاح');
                toast.success(`تم تعبئة المركز ${updatedCenter.name} تلقائياً`);

                // تحديث حالة التعبئة
                await supabase
                  .from('center_stage_refills')
                  .update({ is_refilled: true })
                  .eq('center_id', updatedCenter.id)
                  .eq('stage_id', updatedCenter.stage_id);

                // تحديث القائمة
                fetchCenters();
              }
            }
          }
        }
      )
      .subscribe();

    // إلغاء الاشتراك عند إزالة المكون
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">المراكز</h1>
        <button
          onClick={handleAddNew}
          className="w-full sm:w-auto btn btn-primary flex items-center justify-center"
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
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <div className="block sm:hidden">
                {centers.map((center) => (
                  <div key={center.id} className="bg-white border-b border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{center.name}</h3>
                        <p className="text-sm text-gray-500">{center.location}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        center.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {center.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">المرحلة:</span>
                        <span>{center.stage?.name || 'لا توجد مرحلة'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">السعة الافتراضية:</span>
                        <span>{center.default_capacity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">عدد الحجاج:</span>
                        <span>{center.current_count}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={() => handleRefillSettings(center)}
                        className="btn btn-secondary btn-sm w-full"
                      >
                        إعدادات التعبئة
                      </button>
                      <button
                        onClick={() => handleEdit(center)}
                        className="btn btn-secondary btn-sm w-full"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(center.id)}
                        className="btn btn-danger btn-sm w-full"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <table className="hidden sm:table min-w-full divide-y divide-gray-200">
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
                      السعة الافتراضية
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عدد الحجاج
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
                        {center.default_capacity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {center.current_count}
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
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleRefillSettings(center)}
                            className="btn btn-secondary btn-sm"
                          >
                            إعدادات التعبئة
                          </button>
                          <button
                            onClick={() => handleEdit(center)}
                            className="btn btn-secondary btn-sm"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(center.id)}
                            className="btn btn-danger btn-sm"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <CenterModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        center={selectedCenter as any}
        stages={stages as any}
        onSuccess={fetchCenters}
      />

      <Dialog
        open={showRefillSettings}
        onClose={() => setShowRefillSettings(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium">
                إعدادات التعبئة التلقائية
              </Dialog.Title>
              <button
                onClick={() => setShowRefillSettings(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">إغلاق</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedCenterId && (
              <CenterRefillSettings
                centerId={selectedCenterId}
                onClose={() => setShowRefillSettings(false)}
              />
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  )
} 