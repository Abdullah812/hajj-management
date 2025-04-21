import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PlusIcon } from '@heroicons/react/24/outline'
import { StageModal } from '../components/StageModal'
import { DeleteConfirmation } from '../components/DeleteConfirmation'
import { toast } from 'react-hot-toast'
import { StageMonitor } from '../services/StageMonitor'
import { StageAlerts } from '../components/StageAlerts'
import { calculateStageStats } from '../utils/stageCalculations'
import { validateStageCounts } from '../utils/stageValidation'
import { trackStageChanges } from '../utils/stageTracking'
import { checkStageConsistency } from '../utils/stageConsistency'
import { Stage } from '../types/stage'

export function Stages() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Stage | undefined>()
  const [deleteStage, setDeleteStage] = useState<Stage | null>(null)
  const [deleteLoading] = useState(false)
  const [stageToStart, setStageToStart] = useState<Stage | null>(null)
  const [areas, setAreas] = useState<{ id: number; name: string }[]>([])
  const [] = useState(0)
  const [pilgrimGroups, setPilgrimGroups] = useState<any[]>([])
  const [remainingTimes, setRemainingTimes] = useState<{[key: number]: string}>({})
  const [selectedNationality] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let isSubscribed = true

    async function fetchInitialData() {
      if (!isSubscribed) return
      
      setLoading(true)
      try {
        await Promise.all([
          fetchStages(),
          fetchPilgrimGroups(),
          fetchAreas()
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()

    return () => {
      isSubscribed = false
    }
  }, [refreshKey])

  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('جاري التحديث التلقائي...')
      await Promise.all([
        fetchStages(),
        fetchPilgrimGroups()
      ])
      checkCompletedStages()
    }, 3600000) // 3600000 ميلي ثانية = ساعة واحدة

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimes: {[key: number]: string} = {}
      
      stages.forEach(stage => {
        if (stage.status === 'active') {
          const now = new Date()
          const endTime = new Date(`${stage.end_date}T${stage.end_time}`)
          
          // حساب الفرق بالملي ثانية
          const diffMs = endTime.getTime() - now.getTime()
          if (diffMs > 0) {
            const hours = Math.floor(diffMs / (1000 * 60 * 60))
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
            
            newTimes[stage.id] = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          } else {
            // إذا انتهى الوقت
            handlePauseStage(stage)
          }
        }
      })
      
      setRemainingTimes(newTimes)
    }, 1000) // تحديث كل ثانية

    return () => clearInterval(timer)
  }, [stages])

  const checkWaitingStagesManager = useCallback(async () => {
    try {
      const { data: waitingStages } = await supabase
        .from('stages')
        .select('*')
        .eq('status', 'waiting_departure');

      if (!waitingStages) return;

      for (const stage of waitingStages) {
        // فحص وتحديث حالة كل مرحلة منتظرة
        await processWaitingStage(stage);
      }
    } catch (error) {
      console.error('Error checking waiting stages:', error);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(checkWaitingStagesManager, 1800000); // كل 30 دقيقة
    return () => clearInterval(interval);
  }, [checkWaitingStagesManager]);

  useEffect(() => {
    const checkAndActivateWaitingStages = async () => {
      try {
        const waitingStages = stages.filter(stage => stage.status === 'waiting_departure')
        
        for (const stage of waitingStages) {
          // حساب مجموع المغادرين من المراحل السابقة لنفس المجموعة
          const totalDeparted = stages
            .filter(s => 
              s.pilgrim_group_id === stage.pilgrim_group_id && 
              s.id !== stage.id &&
              (s.status === 'completed' || s.status === 'active')
            )
            .reduce((sum, s) => sum + (s.departed_pilgrims || 0), 0)

          console.log('Checking stage:', {
            stageName: stage.name,
            required: stage.required_departures,
            totalDeparted: totalDeparted
          })

          // تفعيل المرحلة تلقائياً إذا تم الوصول للعدد المطلوب
          if (totalDeparted >= (stage.required_departures || 0)) {
            console.log('تفعيل المرحلة:', {
              stageName: stage.name,
              totalDeparted,
              requiredDepartures: stage.required_departures,
              currentStatus: stage.status
            })

            // التحقق من أن المرحلة لا تزال في حالة الانتظار
            if (stage.status === 'waiting_departure') {
              const now = new Date()
              const startDate = now.toISOString().split('T')[0]
              const startTime = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })

              // تحديث حالة المرحلة إلى نشطة
              supabase
                .from('stages')
                .update({
                  status: 'active',
                  departed_pilgrims: 0, // تصفير عدد المغادرين
                  start_date: startDate,
                  start_time: startTime
                })
                .eq('id', stage.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('خطأ في تفعيل المرحلة:', error)
                  } else {
                    console.log('تم تفعيل المرحلة بنجاح:', stage.name)
                    // تحديث القائمة
                    fetchStages()
                  }
                })
            }
          }
        }
      } catch (error) {
        console.error('Error in checkAndActivateWaitingStages:', error)
      }
    }

    // تشغيل الفحص عندما تتغير المراحل
    checkAndActivateWaitingStages()
  }, [stages])

  useEffect(() => {
    // بدء نظام المراقبة عند تحميل الصفحة
    StageMonitor.startMonitoring()
    
    // إيقاف المراقبة عند مغادرة الصفحة
    return () => {
      StageMonitor.stopMonitoring()
    }
  }, [])

  useEffect(() => {
    const validateStages = () => {
      stages.forEach(stage => {
        const stats = calculateStageStats(stage)
        const errors = validateStageCounts(stage)
        
        if (errors.length > 0) {
          console.warn(`أخطاء في المرحلة ${stage.name}:`, errors)
        }
        
        trackStageChanges(stage, stats)
      })
      
      const consistencyReport = checkStageConsistency(stages)
      if (consistencyReport.hasErrors) {
        console.warn('تقرير التناسق:', consistencyReport.details)
      }
    }
    
    validateStages()
  }, [stages])

  async function fetchStages() {
    try {
      setLoading(true)
      console.log('جاري جلب المراحل...')

      const { data: stagesData, error } = await supabase
        .from('stages')
        .select(`
          *,
          pilgrim_groups!inner (
            id,
            nationality,
            count,
            departed_count
          ),
          areas (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('خطأ في جلب المراحل:', error)
        throw error
      }

      console.log('تم جلب المراحل:', stagesData)
      
      // تحويل البيانات لتضمين الجنسية مباشرة في كائن المرحلة
      const processedStages = stagesData.map(stage => ({
        ...stage,
        nationality: stage.pilgrim_groups?.nationality
      }))

      setStages(processedStages)
    } catch (err) {
      console.error('Error fetching stages:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAreas() {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('id', { ascending: true })
      
      if (error) throw error
      setAreas(data || [])
    } catch (error) {
      console.error('Error fetching areas:', error)
    }
  }

  async function fetchPilgrimGroups() {
    try {
      const { data, error } = await supabase
        .from('pilgrim_groups')
        .select('*')
        .order('nationality')

      if (error) throw error
      console.log('تم جلب مجموعات الحجاج:', data)
      setPilgrimGroups(data || [])
    } catch (error) {
      console.error('خطأ في جلب مجموعات الحجاج:', error)
    }
  }

  function handleAddNew() {
    setSelectedStage(undefined)
    setShowModal(true)
  }

  function handleEdit(stage: Stage) {
    setSelectedStage(stage)
    setShowModal(true)
  }

  async function handleDelete(stageId: number) {
    if (!window.confirm('هل أنت متأكد من حذف هذه المرحلة؟')) return;

    const stage = stages.find(s => s.id === stageId);
    if (!stage) {
      toast.error('لم يتم العثور على المرحلة');
      return;
    }

    // التحقق من إمكانية الحذف
    if (stage.status === 'active') {
      toast.error('لا يمكن حذف مرحلة نشطة');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('delete_stage_with_dependencies', {
        stage_id: stageId
      });

      if (error) throw error;

      toast.success('تم حذف المرحلة بنجاح');
      await fetchStages();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error('حدث خطأ أثناء حذف المرحلة');
    }
  }

  async function handleStartStage(stage: Stage) {
    try {
      const { error } = await supabase
        .from('stages')
        .update({ 
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          start_time: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        })
        .eq('id', stage.id)

      if (error) throw error
      await fetchStages()
    } catch (error) {
      console.error('Error starting stage:', error)
      alert('حدث خطأ أثناء بدء المرحلة')
    }
  }

  async function handlePauseStage(stage: Stage) {
    try {
      const { error } = await supabase
        .from('stages')
        .update({ 
          status: 'inactive'
        })
        .eq('id', stage.id)

      if (error) throw error
      await fetchStages()
    } catch (error) {
      console.error('Error pausing stage:', error)
      alert('حدث خطأ أثناء إيقاف المرحلة')
    }
  }

  async function handleExtendStage(stage: Stage, days: number) {
    try {
      const newEndDate = new Date(stage.end_date)
      newEndDate.setDate(newEndDate.getDate() + days)

      const { error } = await supabase
        .from('stages')
        .update({ 
          end_date: newEndDate.toISOString().split('T')[0]
        })
        .eq('id', stage.id)

      if (error) throw error
      await fetchStages()
    } catch (error) {
      console.error('Error extending stage:', error)
      alert('حدث خطأ أثناء تمديد المرحلة')
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  async function checkCompletedStages() {
    try {
      const now = new Date()
      
      for (const stage of stages) {
        if (stage.status === 'active') {
          const startDateTime = new Date(`${stage.start_date}T${stage.start_time}`)
          const endDateTime = new Date(`${stage.end_date}T${stage.end_time}`)
          
          console.log('Stage Check:', {
            name: stage.name,
            status: stage.status,
            now: now.toISOString(),
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            shouldBeActive: now >= startDateTime && now <= endDateTime
          })

          // المرحلة يجب أن تكون نشطة فقط بين وقت البداية والنهاية
          if (now >= startDateTime && now <= endDateTime) {
            // المرحلة في وقتها الصحيح
            continue
          } else {
            // المرحلة خارج وقتها - تحويلها إلى غير نشطة
            console.log('Stage outside time range - deactivating')
            await supabase
              .from('stages')
              .update({ status: 'inactive' })
              .eq('id', stage.id)
          }
        }
      }
      
      await fetchStages()
    } catch (error) {
      console.error('Error checking completed stages:', error)
    }
  }

  async function handleResumeStage(stage: Stage) {
    try {
      const { error } = await supabase
        .from('stages')
        .update({ 
          status: 'active'
        })
        .eq('id', stage.id)

      if (error) throw error
      await fetchStages()
    } catch (error) {
      console.error('Error resuming stage:', error)
      alert('حدث خطأ أثناء استئناف المرحلة')
    }
  }

  const resetData = async () => {
    if (!window.confirm('هل أنت متأكد من تصفير جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    try {
      setLoading(true);
      
      // تصفير جميع الجداول
      const { error: stagesError } = await supabase
        .from('stages')
        .delete()
        .neq('id', 0);

      const { error: busesError } = await supabase
        .from('buses')
        .delete()
        .neq('id', 0);

      const { error: departureHistoryError } = await supabase
        .from('departure_history')
        .delete()
        .neq('id', 0);

      if (stagesError || busesError || departureHistoryError) {
        throw new Error('حدث خطأ أثناء تصفير البيانات');
      }

      // إعادة تعيين العدادات في المراكز
      const { error: centersError } = await supabase
        .from('centers')
        .update({
          current_count: 0,
          departed_pilgrims: 0,
          current_batch: 1
        })
        .neq('id', 0);

      if (centersError) {
        throw new Error('حدث خطأ أثناء إعادة تعيين المراكز');
      }

      // إعادة تعيين العدادات في مجموعات الحجاج
      const { error: groupsError } = await supabase
        .from('pilgrim_groups')
        .update({
          departed_count: 0
        })
        .neq('id', 0);

      if (groupsError) {
        throw new Error('حدث خطأ أثناء إعادة تعيين مجموعات الحجاج');
      }

      toast.success('تم تصفير جميع البيانات بنجاح');
      
      // تحديث البيانات في الواجهة
      await Promise.all([
        fetchStages(),
        fetchPilgrimGroups()
      ]);

    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('حدث خطأ أثناء تصفير البيانات');
    } finally {
      setLoading(false);
    }
  };

  function getStageStatusDisplay(stage: Stage) {
    switch (stage.status) {
      case 'active':
        return {
          text: 'نشطة',
          className: 'bg-green-100 text-green-800'
        }
      case 'inactive':
        return {
          text: 'قادمة',
          className: 'bg-blue-100 text-blue-800'
        }
      case 'waiting_departure':
        return {
          text: `في انتظار مغادرة ${stage.required_departures} حاج`,
          className: 'bg-yellow-100 text-yellow-800'
        }
      default:
        return {
          text: 'منتهية',
          className: 'bg-gray-100 text-gray-800'
        }
    }
  }

  async function handleStageSuccess() {
    console.log('تم إضافة/تعديل المرحلة بنجاح')
    setShowModal(false)
    
    // تحديث كل البيانات
    await Promise.all([
      fetchStages(),
      fetchPilgrimGroups()
    ])
    
    setRefreshKey(prev => prev + 1)
  }

  function handleTestMonitoring() {
    StageMonitor.testMonitoring()
  }

  const processWaitingStage = async (stage: Stage) => {
    try {
      // حساب مجموع المغادرين من المراحل السابقة
      const { data: previousStages } = await supabase
        .from('stages')
        .select('departed_pilgrims')
        .eq('pilgrim_group_id', stage.pilgrim_group_id)
        .in('status', ['completed', 'active']);

      const totalDeparted = previousStages?.reduce((sum, s) => sum + (s.departed_pilgrims || 0), 0) || 0;

      // تفعيل المرحلة إذا تم الوصول للعدد المطلوب
      if (totalDeparted >= (stage.required_departures || 0)) {
        await supabase
          .from('stages')
          .update({
            status: 'active',
            start_date: new Date().toISOString().split('T')[0],
            start_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          })
          .eq('id', stage.id);
      }
    } catch (error) {
      console.error('Error processing waiting stage:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <StageAlerts />
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">المراحل</h1>
          <div className="mt-4 space-x-2">
            <button 
              onClick={resetData}
              className="btn btn-danger btn-sm"
              disabled={loading}
            >
              {loading ? 'جاري التصفير...' : 'تصفير جميع البيانات'}
            </button>
          </div>
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">إحصائيات الحجاج</h3>
            {loading ? (
              'جاري التحميل...'
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pilgrimGroups?.map(group => {
                  // العدد الكلي الثابت
                  const total = group.count
                  
                  // حساب عدد الحجاج في المراحل النشطة والمكتملة فقط (بدون المنتظرة)
                  const inStages = stages
                    .filter(s => 
                      s.pilgrim_group_id === group.id && 
                      s.status !== 'waiting_departure' // استثناء المراحل المنتظرة
                    )
                    .reduce((sum, s) => sum + (s.current_pilgrims || 0), 0)
                  
                  // حساب المتبقي للإضافة
                  const remaining = Math.max(0, total - inStages)

                  return (
                    <div key={group.nationality} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {group.nationality}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600 dark:text-gray-300">
                          العدد الكلي: {total} حاج
                        </p>
                        <p className="text-green-600 dark:text-green-400">
                          تم إضافتهم في المراحل: {inStages} حاج
                        </p>
                        <p className="text-blue-600 dark:text-blue-400">
                          المتاح للإضافة: {remaining} حاج
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={handleAddNew}
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin h-5 w-5 ml-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              جاري التحميل...
            </span>
          ) : (
            <>
              <PlusIcon className="h-5 w-5 ml-2" />
              إضافة مرحلة
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-primary-600 mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span className="text-gray-600">جاري تحميل البيانات...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {areas.map(area => (
            <div key={area.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                {area.name}
              </h2>
              
              {/* عرض المراحل المنتظرة أولاً */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3 text-yellow-600">المراحل في انتظار المغادرة:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stages
                    .filter(stage => stage.area_id === area.id && stage.status === 'waiting_departure')
                    .map(stage => {
                      // حساب المغادرين المحجوزين في المراحل السابقة
                      const reservedDepartures = stages
                        .filter(s => 
                          s.pilgrim_group_id === stage.pilgrim_group_id && 
                          s.id < stage.id && // المراحل السابقة فقط
                          s.status === 'waiting_departure'
                        )
                        .reduce((sum, s) => sum + (s.required_departures || 0), 0)

                      // حساب إجمالي المغادرين المتاحين (بعد طرح المحجوزين)
                      const availableDepartures = stages
                        .filter(s => 
                          s.pilgrim_group_id === stage.pilgrim_group_id &&
                          (s.status === 'completed' || s.status === 'active')
                        )
                        .reduce((sum, s) => sum + (s.departed_pilgrims || 0), 0)

                      // المغادرين المتاحين للمرحلة الحالية = إجمالي المغادرين - المحجوزين للمراحل السابقة
                      const departuresForCurrentStage = Math.max(0, availableDepartures - reservedDepartures)

                      // حساب النسبة المئوية للمغادرة
                      const departurePercentage = Math.min(
                        (departuresForCurrentStage / (stage.required_departures ?? 1)) * 100,
                        100
                      )

                      return (
                        <div key={stage.id} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-yellow-900">{stage.name}</h4>
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                              في انتظار المغادرة
                            </span>
                          </div>

                          <div className="mt-3 space-y-2">
                            <p className="text-sm text-yellow-800">
                              الجنسية: {stage.nationality || 'غير محدد'}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-yellow-600">المطلوب للتفعيل</p>
                                <p className="font-medium">{stage.required_departures ?? 0}</p>
                              </div>
                              <div>
                                <p className="text-green-600">المغادرين المتاحين</p>
                                <p className="font-medium">{departuresForCurrentStage}</p>
                              </div>
                            </div>

                            {/* شريط التقدم */}
                            <div className="relative pt-1">
                              <div className="overflow-hidden h-2 text-xs flex rounded bg-yellow-200">
                                <div
                                  style={{ width: `${departurePercentage}%` }}
                                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500"
                                />
                              </div>
                              <div className="text-xs text-center mt-1 text-yellow-600">
                                {Math.round(departurePercentage)}% من المغادرات المطلوبة
                              </div>
                            </div>

                            <div className="mt-2 text-center">
                              <p className="text-sm font-medium text-yellow-800">
                                متبقي {Math.max(0, (stage.required_departures ?? 0) - departuresForCurrentStage)} حاج للتفعيل
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* عرض المراحل النشطة والأخرى */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stages
                  .filter(stage => stage.area_id === area.id && stage.status !== 'waiting_departure')
                  .map(stage => {
                    return (
                      <div key={stage.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{stage.name}</h3>
                            {(() => {
                              const status = getStageStatusDisplay(stage)
                              return (
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.className}`}>
                                  {status.text}
                                </span>
                              )
                            })()}
                          </div>
                          
                          <div className="mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              <span className="ml-1">الجنسية:</span>
                              {stage.nationality || 'غير محدد'}
                            </span>
                          </div>

                          <div className="flex flex-col space-y-1 mb-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              من {formatDate(stage.start_date)} {stage.start_time}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              إلى {formatDate(stage.end_date)} {stage.end_time}
                            </p>
                            
                            {new Date(stage.start_date) > new Date() && stage.status !== 'active' && (
                              <button
                                onClick={() => setStageToStart(stage)}
                                className="mt-2 w-full btn btn-primary btn-sm"
                              >
                                بدء المرحلة الآن
                              </button>
                            )}
                            
                            {new Date(stage.start_date) <= new Date() && new Date(stage.end_date) >= new Date() && (
                              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                  الوقت المتبقي: {remainingTimes[stage.id] || '00:00:00'}
                                </p>
                                <div className="mt-2 flex gap-2">
                                  {stage.status === 'active' ? (
                                    <button
                                      onClick={() => handlePauseStage(stage)}
                                      className="btn btn-warning btn-sm flex-1"
                                    >
                                      إيقاف مؤقت
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleStartStage(stage)}
                                      className="btn btn-success btn-sm flex-1"
                                    >
                                      استئناف
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleExtendStage(stage, 1)}
                                    className="btn btn-secondary btn-sm flex-1"
                                  >
                                    تمديد يوم
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {(() => {
                              const now = new Date();
                              const endDateTime = new Date(`${stage.end_date}T${stage.end_time}`);
                              
                              // التحقق من أن الوقت الحالي تجاوز وقت النهاية
                              if (now > endDateTime) {
                                return (
                                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                      انتهت المرحلة
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          <div className="mt-2">
                            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                              <span>الحجاج المسجلين</span>
                              <span className="font-medium">{stage.current_pilgrims}</span>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end space-x-3 space-x-reverse">
                            <button
                              onClick={() => handleEdit(stage)}
                              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              تحرير
                            </button>
                            <button
                              onClick={() => setDeleteStage(stage)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              حذف
                            </button>
                          </div>

                          <div className="mt-4 flex gap-2">
                            {stage.status === 'inactive' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleStartStage(stage)}
                                  className="btn btn-success btn-sm"
                                >
                                  بدء المرحلة
                                </button>
                                <button
                                  onClick={() => handleResumeStage(stage)}
                                  className="btn btn-primary btn-sm"
                                >
                                  استئناف المرحلة
                                </button>
                              </div>
                            )}
                            
                            {stage.status === 'active' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handlePauseStage(stage)}
                                  className="btn btn-warning btn-sm"
                                >
                                  إيقاف مؤقت
                                </button>
                                <div className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                  {remainingTimes[stage.id] || '00:00:00'}
                                </div>
                              </div>
                            )}
                            
                            {stage.status === 'completed' && (
                              <div className="text-sm text-gray-500">
                                المرحلة منتهية
                              </div>
                            )}
                          </div>

                          {stage.status === 'active' && (
                            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                              <h4 className="text-lg font-medium mb-3 flex items-center justify-between">
                                <span>إحصائيات المرحلة</span>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    remainingTimes[stage.id] ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {remainingTimes[stage.id] ? `متبقي ${remainingTimes[stage.id]}` : 'انتهى الوقت'}
                                  </span>
                                </div>
                              </h4>

                              <div className="space-y-4">
                                {/* الأعداد الرئيسية - كما هي */}
                                <div className="grid grid-cols-3 gap-4">
                                  {/* العدد الكلي */}
                                  <div className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="text-sm text-gray-500 mb-1">العدد الكلي</div>
                                    <div className="text-xl font-bold">
                                      {(stage.current_pilgrims || 0) + (stage.departed_pilgrims || 0)}
                                    </div>
                                  </div>
                                  {/* عدد المغادرين */}
                                  <div className="text-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                    <div className="text-sm text-gray-500 mb-1">تم المغادرة</div>
                                    <div className="text-xl font-bold text-green-600">
                                      {stage.departed_pilgrims || 0}
                                    </div>
                                    {/* نسبة التغير */}
                                    {stage.departed_pilgrims > 0 && (
                                      <div className="text-xs text-green-600 mt-1">
                                        +{stage.departed_pilgrims} منذ البداية
                                      </div>
                                    )}
                                  </div>
                                  {/* العدد المتبقي */}
                                  <div className="text-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                    <div className="text-sm text-gray-500 mb-1">المتبقي</div>
                                    <div className="text-xl font-bold text-blue-600">
                                      {stage.current_pilgrims || 0}
                                    </div>
                                  </div>
                                </div>

                                {/* شريط التقدم - كما هو */}
                                <div className="relative pt-3">
                                  <div className="flex mb-2 items-center justify-between">
                                    <div className="text-xs font-semibold text-green-600 dark:text-green-500">
                                      تقدم المغادرة
                                    </div>
                                    {(() => {
                                      const total = (stage.current_pilgrims || 0) + (stage.departed_pilgrims || 0);
                                      const departed = stage.departed_pilgrims || 0;
                                      const percentage = total > 0 ? Math.round((departed / total) * 100) : 0;
                                      return (
                                        <div className="text-xs font-semibold text-green-600 dark:text-green-500">
                                          {percentage}%
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="overflow-hidden h-3 text-xs flex rounded bg-gray-200">
                                    {(() => {
                                      const total = (stage.current_pilgrims || 0) + (stage.departed_pilgrims || 0);
                                      const departed = stage.departed_pilgrims || 0;
                                      const percentage = total > 0 ? (departed / total) * 100 : 0;
                                      
                                      return (
                                        <div 
                                          style={{ width: `${Math.min(percentage, 100)}%` }} 
                                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 rounded-full transition-all duration-500"
                                        />
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* معلومات إضافية موسعة */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div className="col-span-2">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                      <h5 className="font-medium text-blue-900 mb-2">تحليل معدلات المغادرة</h5>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        {/* معدل المغادرة اليومي */}
                                        <div>
                                          <div className="text-blue-600 mb-1">المعدل اليومي</div>
                                          <div className="font-medium text-blue-900">
                                            {(() => {
                                              const departed = stage.departed_pilgrims || 0;
                                              const startDate = new Date(stage.start_date);
                                              const days = Math.max(1, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                                              const rate = Math.round(departed / days);
                                              return (
                                                <div className="flex items-center gap-2">
                                                  <span>{rate} حاج/يوم</span>
                                                  {rate > 0 && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                      {Math.ceil((stage.current_pilgrims || 0) / rate)} يوم للإنتهاء
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>

                                        {/* معدل المغادرة بالساعة */}
                                        <div>
                                          <div className="text-blue-600 mb-1">المعدل بالساعة</div>
                                          <div className="font-medium text-blue-900">
                                            {(() => {
                                              const departed = stage.departed_pilgrims || 0;
                                              const startDate = new Date(stage.start_date);
                                              const hours = Math.max(1, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60)));
                                              return `${Math.round(departed / hours)} حاج/ساعة`;
                                            })()}
                                          </div>
                                        </div>

                                        {/* النسبة المتوقعة للإنجاز */}
                                        <div>
                                          <div className="text-blue-600 mb-1">نسبة الإنجاز المتوقعة</div>
                                          <div className="font-medium text-blue-900">
                                            {(() => {
                                              const total = (stage.current_pilgrims || 0) + (stage.departed_pilgrims || 0);
                                              const departed = stage.departed_pilgrims || 0;
                                              const startDate = new Date(stage.start_date);
                                              const endDate = new Date(stage.end_date);
                                              const now = new Date();
                                              const totalDuration = endDate.getTime() - startDate.getTime();
                                              const elapsedDuration = now.getTime() - startDate.getTime();
                                              const progressRate = elapsedDuration / totalDuration;
                                              const expectedProgress = Math.round(progressRate * 100);
                                              const actualProgress = Math.round((departed / total) * 100);
                                              
                                              const difference = actualProgress - expectedProgress;
                                              const color = difference >= 0 ? 'text-green-600' : 'text-red-600';
                                              
                                              return (
                                                <div className="flex items-center gap-2">
                                                  <span>{expectedProgress}%</span>
                                                  <span className={`text-xs ${color}`}>
                                                    ({difference >= 0 ? '+' : ''}{difference}% عن المتوقع)
                                                  </span>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>

                                        {/* الوقت المتبقي للهدف */}
                                        <div>
                                          <div className="text-blue-600 mb-1">الوقت للهدف</div>
                                          <div className="font-medium text-blue-900">
                                            {(() => {
                                              const remaining = stage.current_pilgrims || 0;
                                              const departed = stage.departed_pilgrims || 0;
                                              const startDate = new Date(stage.start_date);
                                              const endDate = new Date(stage.end_date);
                                              const now = new Date();
                                              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                              const requiredRate = remaining / daysLeft;
                                              
                                              return (
                                                <div className="flex flex-col">
                                                  <span>{daysLeft} يوم متبقي</span>
                                                  <span className="text-xs text-gray-600">
                                                    يتطلب {Math.ceil(requiredRate)} حاج/يوم
                                                  </span>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-gray-50 p-4 rounded-lg">
                                    <h5 className="font-medium text-gray-900 mb-2">التوقعات</h5>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <div className="text-gray-600">الوقت المتوقع للإنتهاء</div>
                                        <div className="font-medium text-gray-900">
                                          {(() => {
                                            const remaining = stage.current_pilgrims || 0;
                                            const departed = stage.departed_pilgrims || 0;
                                            const startDate = new Date(stage.start_date);
                                            const days = Math.max(1, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                                            const rate = departed / days;
                                            const daysRemaining = rate > 0 ? Math.ceil(remaining / rate) : 0;
                                            
                                            if (daysRemaining === 0) return 'اكتملت المغادرة';
                                            const expectedDate = new Date();
                                            expectedDate.setDate(expectedDate.getDate() + daysRemaining);
                                            return `${daysRemaining} يوم (${expectedDate.toLocaleDateString('ar-SA')})`;
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-gray-50 p-4 rounded-lg">
                                    <h5 className="font-medium text-gray-900 mb-2">معلومات المرحلة</h5>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">تاريخ البدء</span>
                                        <span className="font-medium">{new Date(stage.start_date).toLocaleDateString('ar-SA')}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">تاريخ الانتهاء</span>
                                        <span className="font-medium">{new Date(stage.end_date).toLocaleDateString('ar-SA')}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">مدة المرحلة</span>
                                        <span className="font-medium">
                                          {(() => {
                                            const startDate = new Date(stage.start_date);
                                            const endDate = new Date(stage.end_date);
                                            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                            return `${days} يوم`;
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* تحليلات إضافية */}
                                <div className="grid grid-cols-1 gap-4 mt-4">
                                  {/* تحليل الأداء */}
                                  <div className="bg-indigo-50 p-4 rounded-lg">
                                    <h5 className="font-medium text-indigo-900 mb-3">تحليل الأداء والكفاءة</h5>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      {/* كفاءة الوقت */}
                                      <div>
                                        <div className="text-indigo-600 mb-1">كفاءة استخدام الوقت</div>
                                        <div className="font-medium text-indigo-900">
                                          {(() => {
                                            const total = (stage.current_pilgrims || 0) + (stage.departed_pilgrims || 0);
                                            const departed = stage.departed_pilgrims || 0;
                                            const startDate = new Date(stage.start_date);
                                            const endDate = new Date(stage.end_date);
                                            const now = new Date();
                                            
                                            // التأكد من أن الوقت المنقضي لا يتجاوز المدة الكلية
                                            const totalDuration = endDate.getTime() - startDate.getTime();
                                            const elapsedDuration = Math.min(now.getTime() - startDate.getTime(), totalDuration);
                                            
                                            const timeUsagePercentage = Math.round((elapsedDuration / totalDuration) * 100);
                                            const progressPercentage = Math.round((departed / total) * 100);
                                            const efficiency = Math.min(progressPercentage - timeUsagePercentage, 100);
                                            
                                            return (
                                              <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                  efficiency >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                  {efficiency >= 0 ? 'متقدم' : 'متأخر'} بنسبة {Math.min(Math.abs(efficiency), 100)}%
                                                </span>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      {/* التوقعات المستقبلية */}
                                      <div>
                                        <div className="text-indigo-600 mb-1">التوقع النهائي</div>
                                        <div className="font-medium text-indigo-900">
                                          {(() => {
                                            const total = (stage.current_pilgrims || 0) + (stage.departed_pilgrims || 0);
                                            const departed = stage.departed_pilgrims || 0;
                                            const remaining = stage.current_pilgrims || 0;
                                            
                                            // لا يمكن أن يتجاوز الإنجاز المتوقع 100%
                                            const projectedPercentage = Math.min(Math.round((departed / total) * 100), 100);
                                            
                                            return (
                                              <div className="flex flex-col">
                                                <span className={`text-sm ${
                                                  projectedPercentage >= 100 ? 'text-green-600' : 'text-yellow-600'
                                                }`}>
                                                  {projectedPercentage}% إنجاز متوقع
                                                </span>
                                                <span className="text-xs text-gray-600 mt-1">
                                                  {Math.min(departed + remaining, total)} حاج متوقع
                                                </span>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      {/* تحليل المعدلات */}
                                      <div className="col-span-2 bg-white rounded-lg p-3 mt-2">
                                        <div className="text-indigo-600 mb-2">تحليل المعدلات</div>
                                        <div className="space-y-2">
                                          {(() => {
                                            const departed = stage.departed_pilgrims || 0;
                                            const startDate = new Date(stage.start_date);
                                            const now = new Date();
                                            
                                            // حساب الفترات الزمنية بدقة
                                            const hoursDiff = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60)));
                                            const daysDiff = Math.max(1, Math.ceil(hoursDiff / 24));
                                            
                                            // حساب المعدلات مع التقريب المنطقي
                                            const hourlyRate = Math.round(departed / hoursDiff);
                                            const dailyRate = Math.round(departed / daysDiff);
                                            const weeklyRate = Math.round(dailyRate * 7);
                                            
                                            return (
                                              <>
                                                <div className="flex justify-between items-center text-sm">
                                                  <span>المعدل بالساعة:</span>
                                                  <span className="font-medium">{hourlyRate} حاج</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                  <span>المعدل اليومي:</span>
                                                  <span className="font-medium">{dailyRate} حاج</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                  <span>المعدل الأسبوعي المتوقع:</span>
                                                  <span className="font-medium">{weeklyRate} حاج</span>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* توصيات وتنبيهات */}
                                  <div className="bg-yellow-50 p-4 rounded-lg">
                                    <h5 className="font-medium text-yellow-900 mb-2">توصيات وتنبيهات</h5>
                                    <div className="space-y-2 text-sm">
                                      {(() => {
                                        const total = (stage.current_pilgrims || 0) + (stage.departed_pilgrims || 0);
                                        const departed = stage.departed_pilgrims || 0;
                                        const remaining = stage.current_pilgrims || 0;
                                        const startDate = new Date(stage.start_date);
                                        const endDate = new Date(stage.end_date);
                                        const now = new Date();
                                        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        const currentRate = departed / Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                                        const requiredRate = remaining / daysLeft;
                                        
                                        const alerts = [];
                                        
                                        if (requiredRate > currentRate * 1.5) {
                                          alerts.push(
                                            <div key="rate" className="flex items-center gap-2 text-red-700">
                                              <span>⚠️</span>
                                              <span>يجب زيادة معدل المغادرة بنسبة {Math.round((requiredRate/currentRate - 1) * 100)}% للإنتهاء في الوقت المحدد</span>
                                            </div>
                                          );
                                        }
                                        
                                        if (daysLeft < 3 && remaining > 0) {
                                          alerts.push(
                                            <div key="time" className="flex items-center gap-2 text-yellow-700">
                                              <span>⚠️</span>
                                              <span>متبقي {daysLeft} يوم فقط لإنهاء المرحلة</span>
                                            </div>
                                          );
                                        }
                                        
                                        if (alerts.length === 0) {
                                          alerts.push(
                                            <div key="good" className="text-green-700">
                                              ✓ المرحلة تسير وفق المخطط لها
                                            </div>
                                          );
                                        }
                                        
                                        return alerts;
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      <StageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleStageSuccess}
        stage={selectedStage}
      />

      <DeleteConfirmation
        isOpen={!!deleteStage}
        onClose={() => setDeleteStage(null)}
        onConfirm={() => deleteStage && handleDelete(deleteStage.id)}
        title="حذف المرحلة"
        message={`هل أنت متأكد من حذف مرحلة "${deleteStage?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        loading={deleteLoading}
      />

      <DeleteConfirmation
        isOpen={!!stageToStart}
        onClose={() => setStageToStart(null)}
        onConfirm={() => stageToStart && handleStartStage(stageToStart)}
        title="تأكيد بدء المرحلة"
        message={`هل أنت متأكد من بدء مرحلة "${stageToStart?.name}" الآن؟ سيتم تحديث تاريخ ووقت البدء إلى الوقت الحالي.`}
        confirmText="بدء المرحلة"
        confirmButtonClass="btn-primary"
        loading={loading}
      />

      {selectedNationality && (
        <div className="mt-2 text-sm">
          <div className="bg-blue-50 p-3 rounded-md space-y-2">
            <p className="text-blue-700 font-medium">معلومات المجموعة:</p>
            {(() => {
              const group = pilgrimGroups.find(g => g.nationality === selectedNationality)
              if (group) {
                const totalOriginal = group.count + (group.departed_count || 0)
                const totalInStages = stages
                  .filter(s => s.nationality === selectedNationality)
                  .reduce((sum, s) => sum + (s.current_pilgrims || 0), 0)
                const availableToAdd = Math.max(0, totalOriginal - totalInStages)
                
                return (
                  <>
                    <div className="flex flex-col gap-1">
                      <p className="text-blue-600">• العدد الكلي للجنسية: {totalOriginal} حاج</p>
                      <p className="text-blue-600">• تم إضافتهم في المراحل: {totalInStages} حاج</p>
                      <p className="text-blue-600">• المتاح للإضافة: {availableToAdd} حاج</p>
                    </div>
                    {availableToAdd === 0 && (
                      <div className="bg-green-100 p-2 rounded">
                        <p className="text-green-700 font-medium">✓ تم إضافة كامل العدد في المراحل</p>
                      </div>
                    )}
                  </>
                )
              }
              return null
            })()}
          </div>
        </div>
      )}

      <button 
        onClick={handleTestMonitoring}
        className="btn btn-primary btn-sm ml-2"
      >
        اختبار نظام المراقبة
      </button>
    </div>
  )
} 