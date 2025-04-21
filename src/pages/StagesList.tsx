import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type Stage = {
  id: number
  name: string
  max_pilgrims: number
  current_pilgrims: number
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  status: 'active' | 'inactive' | 'completed' | 'waiting_departure'
  required_departures?: number
  departed_pilgrims?: number
  pilgrim_groups?: {
    id: number
    nationality: string
  }
}

const getStageColor = (nationality: string) => {
  const colors = [
    'bg-blue-50 text-blue-800 border-blue-200',
    'bg-green-50 text-green-800 border-green-200',
    'bg-purple-50 text-purple-800 border-purple-200',
    'bg-pink-50 text-pink-800 border-pink-200',
    'bg-yellow-50 text-yellow-800 border-yellow-200',
    'bg-indigo-50 text-indigo-800 border-indigo-200'
  ];
  
  const sum = nationality.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
};

export function StagesList() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStages()
  }, [])

  async function fetchStages() {
    try {
      const { data, error } = await supabase
        .from('stages')
        .select(`
          *,
          pilgrim_groups!pilgrim_group_id (
            id,
            nationality
          )
        `)
        .order('start_date', { ascending: true })

      if (error) throw error
      setStages(data || [])
    } catch (error) {
      console.error('Error fetching stages:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDateTime(date: string, time: string) {
    return new Date(`${date}T${time}`).toLocaleString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="/images/logo.png" 
              alt="شعار الشركة" 
              className="h-16 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">المراحل المتاحة</h1>
              <div className="text-gray-500 mt-1">
                {stages.length > 0 
                  ? `${stages.length} مرحلة متاحة`
                  : 'لا توجد مراحل متاحة حالياً'
                }
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">المراحل النشطة</div>
              <div className="text-2xl font-bold text-primary-600">
                {stages.filter(s => new Date() >= new Date(`${s.start_date}T${s.start_time}`) && 
                                  new Date() <= new Date(`${s.end_date}T${s.end_time}`)).length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">المراحل القادمة</div>
              <div className="text-2xl font-bold text-blue-600">
                {stages.filter(s => new Date() < new Date(`${s.start_date}T${s.start_time}`)).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">لا توجد مراحل متاحة حالياً</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {stages.map((stage) => {
            const now = new Date()
            const startDate = new Date(`${stage.start_date}T${stage.start_time}`)
            const endDate = new Date(`${stage.end_date}T${stage.end_time}`)
            
            let stageStatus = ''
            let statusColor = ''
            let timeRemaining = ''

            if (stage.status === 'waiting_departure') {
              stageStatus = 'في انتظار المغادرة'
              statusColor = 'bg-yellow-100 text-yellow-800'
            } else if (now < startDate) {
              stageStatus = 'قادمة'
              statusColor = 'bg-blue-100 text-blue-800'
              const diff = startDate.getTime() - now.getTime()
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
              timeRemaining = `تبدأ خلال ${days} يوم`
            } else if (now >= startDate && now <= endDate) {
              stageStatus = 'نشطة'
              statusColor = 'bg-green-100 text-green-800'
              const diff = endDate.getTime() - now.getTime()
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
              timeRemaining = `متبقي ${days} يوم`
            } else {
              stageStatus = 'منتهية'
              statusColor = 'bg-gray-100 text-gray-800'
              timeRemaining = 'انتهت المرحلة'
            }

            // حساب المغادرين المتاحين بشكل صحيح
            const availableDepartures = stages
              .filter(s => 
                s.pilgrim_groups?.nationality === stage.pilgrim_groups?.nationality && // نفس الجنسية
                (s.status === 'completed' || s.status === 'active') // المراحل المكتملة والنشطة فقط
              )
              .reduce((sum, s) => sum + (s.departed_pilgrims || 0), 0);

            return (
              <div 
                key={stage.id} 
                className={`${stage.pilgrim_groups?.nationality ? getStageColor(stage.pilgrim_groups.nationality) : 'bg-white'} 
                  rounded-xl shadow-lg border-2 dark:border-gray-700 hover:shadow-xl transition-all duration-300 w-full`.trim()}
              >
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">
                      {stage.name}
                    </h3>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full whitespace-nowrap ${statusColor}`}>
                      {stageStatus}
                    </span>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">عدد الحجاج</span>
                      <span className="text-lg font-bold">
                        {stage.status === 'waiting_departure' 
                          ? (stage.required_departures || 0)
                          : (stage.current_pilgrims || 0)
                        }
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 transition-all duration-300"
                        style={{
                          width: '100%'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-inner">
                      <div className="text-sm font-medium mb-2">وقت البداية</div>
                      <div className="text-base font-bold">
                        {formatDateTime(stage.start_date, stage.start_time)}
                      </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-inner">
                      <div className="text-sm font-medium mb-2">وقت النهاية</div>
                      <div className="text-base font-bold">
                        {formatDateTime(stage.end_date, stage.end_time)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-100 rounded-lg p-4 text-center border-2 border-blue-200">
                      <div className="text-blue-800 text-sm font-medium mb-1">العدد الكلي</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {stage.current_pilgrims + (stage.departed_pilgrims || 0)}
                      </div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-4 text-center border-2 border-green-200">
                      <div className="text-green-800 text-sm font-medium mb-1">تم المغادرة</div>
                      <div className="text-2xl font-bold text-green-900">
                        {stage.departed_pilgrims || 0}
                      </div>
                    </div>
                    <div className="bg-yellow-100 rounded-lg p-4 text-center border-2 border-yellow-200">
                      <div className="text-yellow-800 text-sm font-medium mb-1">المتبقي</div>
                      <div className="text-2xl font-bold text-yellow-900">
                        {stage.current_pilgrims}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">نسبة المغادرة</span>
                      <span className="text-sm font-bold">
                        {Math.round((stage.departed_pilgrims || 0) / (stage.current_pilgrims + (stage.departed_pilgrims || 0)) * 100)}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round((stage.departed_pilgrims || 0) / (stage.current_pilgrims + (stage.departed_pilgrims || 0)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {stage.status === 'waiting_departure' && (
                  <div className="p-6 space-y-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold mb-2">{stage.name}</h3>
                      <p className="text-sm text-gray-600">
                        الجنسية: {stage.pilgrim_groups?.nationality || 'غير محدد'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <p className="text-yellow-800 text-sm mb-1">المطلوب للتفعيل</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {stage.required_departures || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-green-800 text-sm mb-1">المغادرين المتاحين</p>
                        <p className="text-2xl font-bold text-green-900">
                          {availableDepartures}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-inner">
                      <div className="h-2 bg-yellow-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              (availableDepartures / (stage.required_departures || 1)) * 100,
                              100
                            )}%`
                          }}
                        />
                      </div>
                      <div className="text-center mt-2 text-sm text-yellow-800">
                        {Math.round((availableDepartures / (stage.required_departures || 1)) * 100)}% من المغادرات المطلوبة
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-medium text-yellow-800">
                        متبقي {Math.max(0, (stage.required_departures || 0) - availableDepartures)} حاج للتفعيل
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 