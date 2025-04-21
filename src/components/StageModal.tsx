import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

interface StageModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  stage?: {
    id: number
    name: string
    start_date: string
    start_time: string
    end_date: string
    end_time: string
    current_pilgrims: number
    status: 'active' | 'inactive' | 'completed' | 'waiting_departure'
    pilgrim_group_id?: number
    area_id: number
    required_departures?: number
    departed_pilgrims: number
    total_pilgrims: number
  }
}

export function StageModal({ isOpen, onClose, stage, onSuccess }: StageModalProps) {
  const [name, setName] = useState('')
  const [currentPilgrims, setCurrentPilgrims] = useState('0')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'completed' | 'waiting_departure'>('inactive')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pilgrimGroups, setPilgrimGroups] = useState<any[]>([])
  const [selectedNationality, setSelectedNationality] = useState('')
  const [areas, setAreas] = useState<{ id: number; name: string }[]>([])
  const [selectedArea, setSelectedArea] = useState<number | null>(null)
  const [, setDepartureStats] = useState<{
    stage_name: string
    nationality: string
    total: number
    departed: number
  }[]>([])
  const [isWaitingDeparture, setIsWaitingDeparture] = useState(false)
  const [requiredDepartures, setRequiredDepartures] = useState('')
  const [, setTotalInStages] = useState(0)
  const [, setAvailableToAdd] = useState(0)
  const [, setGroupStats] = useState({ total: 0, inStages: 0, available: 0 })
  const [stages, setStages] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch stages
        const { data: stagesData } = await supabase
          .from('stages')
          .select('*')
          .not('status', 'eq', 'completed')
        setStages(stagesData || [])

        // جلب مجموعات الحجاج
        const { data: groupsData, error: groupsError } = await supabase
          .from('pilgrim_groups')
          .select('*')
          .order('nationality')

        if (groupsError) throw groupsError
        console.log('تم جلب مجموعات الحجاج:', groupsData)
        setPilgrimGroups(groupsData || [])

        // جلب المناطق
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*')
          .order('name')

        if (areasError) throw areasError
        setAreas(areasData || [])
      } catch (error) {
        console.error('خطأ في جلب البيانات:', error)
      }
    }

    fetchData()
  }, []) // تشغيل مرة واحدة عند فتح النافذة

  useEffect(() => {
    if (stage) {
      setName(stage.name)
      setCurrentPilgrims(stage.current_pilgrims.toString())
      setStartDate(stage.start_date.split('T')[0])
      setStartTime(stage.start_time || '')
      setEndDate(stage.end_date.split('T')[0])
      setEndTime(stage.end_time || '')
      setStatus(stage.status)
      setSelectedArea(stage.area_id)
      
      // جلب معلومات المجموعة
      const fetchPilgrimGroup = async () => {
        if (stage.pilgrim_group_id) {
          const { data } = await supabase
            .from('pilgrim_groups')
            .select('nationality')
            .eq('id', stage.pilgrim_group_id)
            .single()
          
          if (data) {
            setSelectedNationality(data.nationality)
          }
        }
      }
      
      fetchPilgrimGroup()
    } else {
      setName('')
      setCurrentPilgrims('0')
      setStartDate('')
      setStartTime('')
      setEndDate('')
      setEndTime('')
      setStatus('inactive')
      setSelectedNationality('')
      setSelectedArea(null)
    }
  }, [stage])

  useEffect(() => {
    async function fetchDepartureStats() {
      try {
        const { data } = await supabase
          .from('stages')
          .select(`
            id,
            name,
            current_pilgrims,
            departed_pilgrims,
            status,
            pilgrim_groups (
              nationality
            )
          `)
          .order('created_at')

        if (data) {
          console.log('بيانات المراحل:', data)
          const stats = data.map(stage => ({
            stage_name: stage.name,
            nationality: stage.pilgrim_groups?.[0]?.nationality || 'غير معروف',
            total: stage.current_pilgrims || 0,
            departed: stage.departed_pilgrims || 0,
            remaining: (stage.current_pilgrims || 0) - (stage.departed_pilgrims || 0)
          }))

          setDepartureStats(stats)
        }
      } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error)
      }
    }

    fetchDepartureStats()
  }, [])

  useEffect(() => {
    async function fetchStagesTotal() {
      if (selectedNationality) {
        const group = pilgrimGroups.find(g => g.nationality === selectedNationality)
        if (group) {
          const { data: activeStages } = await supabase
            .from('stages')
            .select('current_pilgrims')
            .eq('pilgrim_group_id', group.id)
            .not('status', 'eq', 'completed')

          const totalOriginal = group.count
          const totalInStages = activeStages?.reduce((sum, stage) => sum + (stage.current_pilgrims || 0), 0) || 0
          
          const availableToAdd = Math.max(0, totalOriginal - totalInStages)

          console.log('تفاصيل الحسابات:', {
            totalOriginal,
            totalInStages,
            availableToAdd,
            activeStages
          })

          setTotalInStages(totalInStages)
          setAvailableToAdd(availableToAdd)
        }
      }
    }
    fetchStagesTotal()
  }, [selectedNationality, pilgrimGroups])

  useEffect(() => {
    async function fetchGroupStats() {
      if (selectedNationality) {
        const group = pilgrimGroups.find(g => g.nationality === selectedNationality)
        if (group) {
          const { data: activeStages } = await supabase
            .from('stages')
            .select('current_pilgrims')
            .eq('pilgrim_group_id', group.id)
            .not('status', 'eq', 'completed')

          const inStages = activeStages?.reduce((sum, stage) => sum + (stage.current_pilgrims || 0), 0) || 0
          setGroupStats({
            total: group.count,
            inStages,
            available: group.count - inStages
          })
        }
      }
    }
    fetchGroupStats()
  }, [selectedNationality])

  // تعديل دالة checkWaitingStages
  async function checkWaitingStages() {
    try {
      // جلب المراحل المنتظرة مرتبة حسب تاريخ إنشائها
      const { data: waitingStages } = await supabase
        .from('stages')
        .select(`
          id,
          name,
          required_departures,
          pilgrim_group_id,
          created_at
        `)
        .eq('status', 'waiting_departure')
        .order('created_at', { ascending: true })

      if (!waitingStages || waitingStages.length === 0) return

      // جلب المراحل المكتملة والنشطة
      const { data: activeStages } = await supabase
        .from('stages')
        .select(`
          id,
          departed_pilgrims,
          pilgrim_group_id,
          status,
          created_at
        `)
        .in('status', ['completed', 'active'])
        .order('created_at', { ascending: true })

      if (!activeStages) return

      // حساب المغادرين المحجوزين للمراحل السابقة
      let reservedDepartures = 0

      // فحص كل مرحلة منتظرة
      for (const waitingStage of waitingStages) {
        // حساب إجمالي المغادرين لهذه المجموعة
        const totalDepartures = activeStages
          .filter(s => s.pilgrim_group_id === waitingStage.pilgrim_group_id)
          .reduce((sum, stage) => sum + (stage.departed_pilgrims || 0), 0)

        // المغادرين المتاحين = الإجمالي - المحجوز للمراحل السابقة
        const availableDepartures = totalDepartures - reservedDepartures

        console.log('فحص المرحلة:', {
          stageName: waitingStage.name,
          required: waitingStage.required_departures,
          totalDepartures,
          reservedDepartures,
          availableDepartures
        })

        if (availableDepartures >= (waitingStage.required_departures || 0)) {
          // تفعيل المرحلة
          const { error } = await supabase
            .from('stages')
            .update({
              status: 'active',
              departed_pilgrims: 0,
              start_date: new Date().toISOString().split('T')[0],
              start_time: new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })
            })
            .eq('id', waitingStage.id)

          if (error) {
            console.error('خطأ في تفعيل المرحلة:', error)
            continue
          }

          // إضافة العدد المطلوب للمحجوز
          reservedDepartures += (waitingStage.required_departures || 0)
        }
      }
    } catch (error) {
      console.error('خطأ في فحص المراحل المنتظرة:', error)
    }
  }

  // تعديل handleSubmit لاستدعاء الدالة بعد تحديث المغادرين
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // التحقق من الحقول المطلوبة
      if (!name.trim()) throw new Error('الرجاء إدخال اسم المرحلة')
      if (!selectedNationality) throw new Error('الرجاء اختيار الجنسية')
      if (!selectedArea) throw new Error('الرجاء اختيار القسم')
      if (!startDate) throw new Error('الرجاء تحديد تاريخ البداية')
      if (!endDate) throw new Error('الرجاء تحديد تاريخ النهاية')
      if (!currentPilgrims || parseInt(currentPilgrims) <= 0) {
        throw new Error('الرجاء تحديد عدد الحجاج')
      }

      const pilgrimGroup = pilgrimGroups.find(g => g.nationality === selectedNationality)
      if (!pilgrimGroup) throw new Error('لم يتم العثور على مجموعة الحجاج')

      const stageData = {
        name: name.trim(),
        start_date: startDate,
        start_time: startTime || '00:00',
        end_date: endDate,
        end_time: endTime || '23:59',
        current_pilgrims: parseInt(currentPilgrims),
        status: isWaitingDeparture ? 'waiting_departure' : status,
        area_id: selectedArea,
        pilgrim_group_id: pilgrimGroup.id,
        required_departures: isWaitingDeparture ? parseInt(requiredDepartures) : null
      }

      console.log('بيانات المرحلة للإرسال:', stageData)

      // إضافة المرحلة فقط
      const result = stage?.id
        ? await supabase
            .from('stages')
            .update(stageData)
            .eq('id', stage.id)
        : await supabase
            .from('stages')
            .insert([stageData])

      if (result.error) throw result.error

      console.log('تم حفظ المرحلة بنجاح:', result.data)
      await checkWaitingStages()
      onSuccess()
      onClose()

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'حدث خطأ غير معروف')
    } finally {
      setLoading(false)
    }
  }

  const handlePilgrimsLeave = async (count: number) => {
    if (!stage) {
      toast.error('لم يتم العثور على المرحلة');
      return;
    }

    try {
      const remainingPilgrims = stage.total_pilgrims - stage.departed_pilgrims;
      
      if (count > remainingPilgrims) {
        toast.error(`لا يمكن تسجيل مغادرة أكثر من العدد المتبقي (${remainingPilgrims} حاج)`);
        return;
      }

      const newDepartedCount = stage.departed_pilgrims + count;
      
      const { error } = await supabase
        .from('stages')
        .update({ 
          departed_pilgrims: newDepartedCount 
        })
        .eq('id', stage.id);

      if (error) throw error;
      
      toast.success(`تم تسجيل مغادرة ${count} حاج بنجاح`);
      onSuccess?.();
    } catch (error) {
      console.error('Error recording pilgrims leave:', error);
      toast.error('حدث خطأ أثناء تسجيل المغادرة');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg w-full max-w-md mx-4 p-6">
          <div className="absolute left-4 top-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            {stage ? 'تحرير المرحلة' : 'إضافة مرحلة جديدة'}
          </Dialog.Title>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                اسم المرحلة
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
                الجنسية
              </label>
              <select
                id="nationality"
                value={selectedNationality}
                onChange={async (e) => {
                  setSelectedNationality(e.target.value)
                  const group = pilgrimGroups.find(g => g.nationality === e.target.value)
                  if (group) {
                    const { data: activeStages } = await supabase
                      .from('stages')
                      .select('current_pilgrims')
                      .eq('pilgrim_group_id', group.id)
                      .not('status', 'eq', 'completed')

                    const inStages = activeStages?.reduce((sum, stage) => sum + (stage.current_pilgrims || 0), 0) || 0
                    const availableCount = group.count - inStages
                    setCurrentPilgrims(availableCount.toString())
                  }
                }}
                className="mt-1 input"
                disabled={loading}
              >
                <option value="">اختر الجنسية</option>
                {pilgrimGroups.map(group => {
                  // حساب العدد المتاح للجنسية
                  const inStages = stages
                    .filter(s => s.pilgrim_group_id === group.id)
                    .reduce((sum, s) => sum + (s.current_pilgrims || 0), 0)
                  
                  const availableCount = group.count - inStages

                  return (
                    <option key={group.id} value={group.nationality}>
                      {group.nationality} - المتبقي: {availableCount} من {group.count}
                    </option>
                  )
                })}
              </select>
              {selectedNationality && (
                <div className="mt-2 text-sm">
                  <div className="bg-blue-50 p-3 rounded-md space-y-2">
                    <p className="text-blue-700 font-medium">معلومات المجموعة:</p>
                    {(() => {
                      const group = pilgrimGroups.find(g => g.nationality === selectedNationality)
                      if (group) {
                        // نستخدم نفس طريقة الحساب كما في الشاشة الرئيسية
                        const totalOriginal = group.count
                        
                        // حساب المضاف في المراحل
                        const inStages = stages
                          .filter(s => s.pilgrim_group_id === group.id && s.id !== stage?.id)
                          .reduce((sum, s) => sum + (s.current_pilgrims || 0), 0)
                        
                        // العدد المراد إضافته حالياً
                        const currentValue = parseInt(currentPilgrims) || 0
                        const availableToAdd = Math.max(0, totalOriginal - inStages)

                        console.log('تفاصيل الحسابات:', {
                          totalOriginal,
                          inStages,
                          currentValue,
                          availableToAdd
                        })

                        return (
                          <>
                            <div className="flex flex-col gap-1">
                              <p className="text-blue-600">• العدد الكلي للجنسية: {totalOriginal} حاج</p>
                              <p className="text-blue-600">• تم إضافتهم في المراحل: {inStages} حاج</p>
                              <p className="text-blue-600">• المتاح للإضافة: {availableToAdd} حاج</p>
                            </div>
                          </>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="currentPilgrims" className="block text-sm font-medium text-gray-700">
                عدد الحجاج المطلوب ترحيلهم
              </label>
              <input
                type="number"
                id="currentPilgrims"
                value={currentPilgrims}
                onChange={(e) => setCurrentPilgrims(e.target.value)}
                className="mt-1 input"
                disabled={loading}
                min="0"
              />
              {selectedNationality && parseInt(currentPilgrims) > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  {(() => {
                    const group = pilgrimGroups.find(g => g.nationality === selectedNationality)
                    if (group) {
                      // حساب العدد المضاف في المراحل الحالية
                      const inStages = stages
                        .filter(s => s.pilgrim_group_id === group.id)
                        .reduce((sum, s) => sum + (s.current_pilgrims || 0), 0)
                      
                      // العدد المتبقي = العدد الكلي - (المضاف في المراحل + العدد المراد إضافته)
                      const remaining = Math.max(0, group.count - (inStages + parseInt(currentPilgrims)))

                      if (remaining === 0) {
                        return <span className="text-green-600">سيتم ترحيل جميع الحجاج المتبقين</span>
                      }
                      return `سيتبقى ${remaining} حاج`
                    }
                    return null
                  })()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 input"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                  وقت البداية
                </label>
                <input
                  type="time"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  تاريخ النهاية
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 input"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                  وقت النهاية
                </label>
                <input
                  type="time"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 input"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                الحالة
              </label>
              <select
                id="status"
                value={status}
                onChange={async (e) => {
                  const newStatus = e.target.value as 'active' | 'inactive' | 'completed' | 'waiting_departure'
                  if (newStatus === 'active' && status === 'inactive') {
                    // جلب جميع المراحل النشطة لهذه الجنسية
                    const { data: activeStages } = await supabase
                      .from('stages')
                      .select('current_pilgrims')
                      .eq('pilgrim_group_id', pilgrimGroups.find(g => g.nationality === selectedNationality)?.id)
                      .eq('status', 'active')

                    // حساب مجموع الحجاج في المراحل النشطة
                    const totalInStages = activeStages?.reduce((sum, stage) => sum + stage.current_pilgrims, 0) || 0
                    
                    // إذا كان المجموع يساوي العدد الكلي للجنسية
                    if (totalInStages === pilgrimGroups.find(g => g.nationality === selectedNationality)?.count) {
                      setError(`لا يمكن تفعيل المرحلة حتى يتم تصفير عدد حجاج جنسية ${selectedNationality}`)
                      return
                    }
                  }
                  setStatus(newStatus)
                }}
                className="mt-1 input"
                disabled={loading}
              >
                <option value="inactive">غير نشطة</option>
                <option value="active">نشطة</option>
                <option value="completed">مكتملة</option>
              </select>
              {status !== 'active' && selectedNationality && (
                <p className="mt-1 text-sm text-gray-500">
                  {(() => {
                    const group = pilgrimGroups.find(g => g.nationality === selectedNationality)
                    if (group) {
                      const departed = group.departed_count || 0
                      const total = group.count || 0
                      return `المغادرين من ${selectedNationality}: ${departed} من ${total}`
                    }
                    return ''
                  })()}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="area" className="block text-sm font-medium text-gray-700">
                القسم
              </label>
              <select
                id="area"
                value={selectedArea || ''}
                onChange={(e) => setSelectedArea(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 input"
                disabled={loading}
              >
                <option value="">اختر القسم</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isWaitingDeparture}
                  onChange={(e) => setIsWaitingDeparture(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="mr-2">مرحلة تنتظر المغادرة</span>
              </label>
            </div>

            {isWaitingDeparture && (
              <div className="mt-4">
                <label className="block text-sm font-medium">
                  عدد المغادرين المطلوب للتفعيل
                </label>
                <input
                  type="number"
                  value={requiredDepartures}
                  onChange={(e) => setRequiredDepartures(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  required
                />
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium">تسجيل مغادرة حجاج</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  value={currentPilgrims}
                  onChange={(e) => setCurrentPilgrims(e.target.value)}
                  className="input flex-1"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => handlePilgrimsLeave(parseInt(currentPilgrims))}
                  className="btn btn-primary"
                >
                  تسجيل المغادرة
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'جاري الحفظ...' : stage ? 'حفظ التغييرات' : 'إضافة المرحلة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 