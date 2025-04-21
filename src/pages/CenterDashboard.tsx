import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthorization } from '../hooks/useAuthorization'
import { useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { toast } from 'react-hot-toast'
import { DepartureHistory } from '../components/DepartureHistory'

interface Stage {
  id: string | number
  name: string
  current_pilgrims: number
}

interface Center {
  id: string
  name: string
  location: string
  current_count: number
  default_capacity: number
  stage_id?: number
  departed_pilgrims?: number
  current_batch?: number
}
export function CenterDashboard() {
  const { id } = useParams()
  const { loading: authLoading, userRole } = useAuthorization(Number(id))
  const [center, setCenter] = useState<Center | null>(null)

  const [stages, setStages] = useState<Stage[]>([])
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [departureCount, setDepartureCount] = useState(1)
  const [updating, setUpdating] = useState(false)
  const [nationalities, setNationalities] = useState<string[]>([])
  const [selectedNationality, setSelectedNationality] = useState<string>('')

  const hasAccess = userRole === 'manager' || userRole === 'staff'

  useEffect(() => {
    getCurrentUserCenter()
    fetchNationalities()
  }, [])

  async function fetchNationalities() {
    try {
      const { data, error } = await supabase
        .from('pilgrim_groups')
        .select('nationality')
        .order('nationality')
      
      if (error) throw error
      
      const uniqueNationalities = [...new Set(data.map(item => item.nationality))]
      setNationalities(uniqueNationalities)
    } catch (error) {
      console.error('Error fetching nationalities:', error)
    }
  }

  async function fetchStages() {
    try {
      let query = supabase
        .from('stages')
        .select(`
          id, 
          name, 
          current_pilgrims,
          pilgrim_groups!inner (nationality)
        `)
        .eq('status', 'active')

      if (selectedNationality) {
        query = query.eq('pilgrim_groups.nationality', selectedNationality)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      
      setStages(data.map(stage => ({
        id: stage.id,
        name: stage.name,
        current_pilgrims: stage.current_pilgrims
      })))
    } catch (error) {
      console.error('Error fetching stages:', error)
    }
  }

  useEffect(() => {
    fetchStages()
  }, [selectedNationality])

  async function getCurrentUserCenter() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('لم يتم تسجيل الدخول')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('center_id')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      if (!profile?.center_id) {
        setLoading(false)
        return
      }

      const { data: centerData, error: centerError } = await supabase
        .from('centers')
        .select('id, name, location, current_count, stage_id, default_capacity, departed_pilgrims')
        .eq('id', profile.center_id)
        .single()

      if (centerError) throw centerError
      setCenter(centerData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateCount() {
    if (!center || !selectedStage || departureCount <= 0 || departureCount > center.current_count) return;
    
    try {
      setUpdating(true);
      
      // 1. تحديث الأعداد
      const { data, error } = await supabase.rpc('update_departure_counts', {
        p_center_id: Number(center.id),
        p_stage_id: Number(selectedStage.id),
        p_departure_count: departureCount
      });

      if (error) throw error;

      if (data && data.success) {
        // 2. تسجيل المغادرة في السجل
        const { error: historyError } = await supabase
          .from('departure_history')
          .insert({
            center_id: center.id,
            batch_number: center.current_batch || 1,
            departed_count: departureCount,
            notes: `مغادرة ${departureCount} حاج من المرحلة ${selectedStage.name}`
          });

        if (historyError) {
          console.error('خطأ في تسجيل المغادرة:', historyError);
        }

        // تحديث حالة المركز محلياً
        const newCount = center.current_count - departureCount;
        setCenter(prev => prev ? { 
          ...prev, 
          current_count: newCount,
          departed_pilgrims: (prev.departed_pilgrims || 0) + departureCount 
        } : null);
        
        setSelectedStage(prev => prev ? { 
          ...prev, 
          current_pilgrims: prev.current_pilgrims - departureCount 
        } : null);

        toast.success('تم تحديث العدد بنجاح');
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ أثناء تحديث العدد');
    } finally {
      setUpdating(false);
    }
  }

  if (authLoading) {
    return <LoadingSpinner />
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">غير مصرح بالوصول</h2>
          <p className="mt-2 text-gray-600">ليس لديك صلاحية الوصول إلى هذه الصفحة</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!center) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">لم يتم العثور على المركز</h2>
          <p className="mt-2 text-gray-600">يرجى التواصل مع المشرف</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-xl font-bold mb-2">{center.name}</h1>
          <p className="text-gray-600 mb-6">{center.location}</p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر الجنسية:
            </label>
            <select
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedNationality}
              onChange={(e) => {
                setSelectedNationality(e.target.value)
                setSelectedStage(null)
              }}
            >
              <option value="">جميع الجنسيات</option>
              {nationalities.map(nationality => (
                <option key={nationality} value={nationality}>
                  {nationality}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المرحلة:
            </label>
            <select
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedStage?.id?.toString() || ''}
              onChange={async (e) => {
                const stage = stages.find(s => s.id.toString() === e.target.value)
                setSelectedStage(stage || null)
                
                if (stage && center) {
                  try {
                    // تحديث stage_id و current_count في جدول centers
                    const { error } = await supabase
                      .from('centers')
                      .update({ 
                        stage_id: Number(stage.id),
                        current_count: center.default_capacity,  // تحديث العدد الحالي
                        departed_pilgrims: 0  // إعادة تعيين عدد المغادرين
                      })
                      .eq('id', center.id)

                    if (error) throw error

                    // تحديث حالة المركز محلياً
                    setCenter(prev => prev ? { 
                      ...prev, 
                      stage_id: Number(stage.id),
                      current_count: center.default_capacity,
                      departed_pilgrims: 0
                    } : null)

                    // التحقق من وجود سجل في center_stage_refills
                    const { data: existingRefill } = await supabase
                      .from('center_stage_refills')
                      .select('*')
                      .eq('center_id', center.id)
                      .eq('stage_id', Number(stage.id))
                      .maybeSingle()

                    if (!existingRefill) {
                      // إضافة سجل جديد فقط إذا لم يكن موجوداً
                      const { error: refillError } = await supabase
                        .from('center_stage_refills')
                        .insert({
                          center_id: center.id,
                          stage_id: Number(stage.id),
                          should_refill: true,
                          is_refilled: true,  // تعيين كـ true لأننا قمنا بالتعبئة مباشرة
                          refill_date: new Date().toISOString()
                        })

                      if (refillError) throw refillError
                    } else {
                      // تحديث السجل الموجود
                      const { error: updateError } = await supabase
                        .from('center_stage_refills')
                        .update({
                          should_refill: true,
                          is_refilled: true,  // تعيين كـ true لأننا قمنا بالتعبئة مباشرة
                          refill_date: new Date().toISOString()
                        })
                        .eq('center_id', center.id)
                        .eq('stage_id', Number(stage.id))

                      if (updateError) throw updateError
                    }

                    toast.success('تم تحديث المرحلة وتعبئة المركز بنجاح')
                  } catch (error) {
                    console.error('Error updating stage:', error)
                    toast.error('حدث خطأ أثناء تحديث المرحلة')
                  }
                }
              }}
            >
              <option value="">اختر المرحلة</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id.toString()}>
                  {stage.name} - ({stage.current_pilgrims} حاج)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-sm text-primary-600 mb-1">عدد حجاج المركز</div>
                <div className="text-2xl font-bold text-primary-700">{center.current_count}</div>
              </div>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-sm text-primary-600 mb-1">عدد حجاج المرحلة</div>
                <div className="text-2xl font-bold text-primary-700">
                  {selectedStage?.current_pilgrims || 0}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!selectedStage || center.current_count <= 0}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            تسجيل مغادرة
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <DepartureHistory centerId={Number(center.id)} />
        </div>
      </div>
      
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">تسجيل مغادرة</h2>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">عدد المغادرين:</label>
              <input
                type="number"
                min={1}
                max={center.current_count}
                value={departureCount}
                onChange={(e) => setDepartureCount(Number(e.target.value))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <p className="mt-2 text-sm text-gray-500">
                الحد الأقصى: {center.current_count} حاج
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={updateCount}
                disabled={updating || departureCount <= 0 || departureCount > center.current_count}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'جاري التحديث...' : 'تأكيد'}
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setDepartureCount(1)
                }}
                disabled={updating}
                className="flex-1 bg-gray-100 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 