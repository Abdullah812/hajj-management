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
  status: 'active' | 'inactive' | 'completed'
}

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
        .select('*')
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => {
            const now = new Date()
            const startDate = new Date(`${stage.start_date}T${stage.start_time}`)
            const endDate = new Date(`${stage.end_date}T${stage.end_time}`)
            
            let stageStatus = ''
            let statusColor = ''
            let timeRemaining = ''

            if (now < startDate) {
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

            return (
              <div key={stage.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{stage.name}</h3>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                      {stageStatus}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className={`p-3 rounded-md ${
                      now < startDate ? 'bg-blue-50' :
                      now <= endDate ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      <p className={`text-sm font-medium ${
                        now < startDate ? 'text-blue-800' :
                        now <= endDate ? 'text-green-800' : 'text-gray-800'
                      }`}>
                        {timeRemaining}
                      </p>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500">عدد الحجاج</div>
                      <div className="mt-1 flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-900">
                          {stage.current_pilgrims} / {stage.max_pilgrims}
                        </span>
                        <div className="flex-grow mr-4 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              stage.current_pilgrims >= stage.max_pilgrims 
                                ? 'bg-red-500' 
                                : stage.current_pilgrims >= stage.max_pilgrims * 0.8 
                                  ? 'bg-yellow-500' 
                                  : 'bg-primary-600'
                            }`}
                            style={{ 
                              width: `${Math.min((stage.current_pilgrims / stage.max_pilgrims) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500">وقت البداية</div>
                      <div className="mt-1 text-gray-900">
                        {formatDateTime(stage.start_date, stage.start_time)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500">وقت النهاية</div>
                      <div className="mt-1 text-gray-900">
                        {formatDateTime(stage.end_date, stage.end_time)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 