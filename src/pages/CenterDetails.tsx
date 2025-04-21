import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

type Center = {
  id: number
  name: string
  location: string
  manager_id: string
  status: 'active' | 'inactive'
}

type Bus = {
  id: string
  bus_name: string
  driver_name: string
  departure_time: string
  trip_status: 'waiting' | 'in_progress' | 'completed' | 'cancelled'
  center_id: number
}

type TripStage = 
  | 'storage_to_hotel'
  | 'hotel_to_mashaar'
  | 'mashaar_to_hotel'
  | 'stage_completed'

type TripLog = {
  id: string
  bus_id: string
  stage: TripStage
  timestamp: string
  notes?: string
  stage_number: number
  is_completed: boolean
}

type TripRoute = {
  from: 'storage' | 'hotel' | 'mashaar';
  to: 'hotel' | 'mashaar';
  label: string;
}

export function CenterDetails() {
  const { id } = useParams()
  const [center, setCenter] = useState<Center | null>(null)
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<TripLog[]>([])

  useEffect(() => {
    fetchCenter()
    fetchIncomingBuses()
  }, [id])

  async function fetchCenter() {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCenter(data)
    } catch (error) {
      console.error('Error fetching center:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchIncomingBuses() {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('center_id', id)
        .eq('trip_status', 'in_progress')

      if (error) throw error
      setBuses(data || [])
    } catch (error) {
      console.error('Error fetching buses:', error)
    }
  }

  const fetchLogs = async (busId: string) => {
    const { data, error } = await supabase
      .from('trip_logs')
      .select('*')
      .eq('bus_id', busId)
      .order('timestamp', { ascending: false })

    if (!error && data) {
      setLogs(data)
    }
  }

  if (loading) {
    return <div>جاري التحميل...</div>
  }

  if (!center) {
    return <div>لم يتم العثور على المركز</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{center.name}</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">الموقع</dt>
            <dd className="mt-1 text-sm text-gray-900">{center.location}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">الحالة</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {center.status === 'active' ? 'نشط' : 'غير نشط'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">الباصات القادمة</h2>
        {buses.length === 0 ? (
          <p className="text-gray-500">لا توجد باصات قادمة حالياً</p>
        ) : (
          <div className="space-y-4">
            {buses.map(bus => (
              <div key={bus.id} className="border rounded-lg p-4">
                <div className="mb-4">
                  <h3 className="font-medium">{bus.bus_name}</h3>
                  <p className="text-sm text-gray-600">السائق: {bus.driver_name}</p>
                </div>
                <TripStageLogger 
                  bus={bus} 
                  onUpdate={fetchIncomingBuses} 
                  logs={logs}
                  onLogAdded={() => fetchLogs(bus.id)}
                />
                <div className="mt-4">
                  <h4 className="font-medium mb-2">سجل الرحلة:</h4>
                  <TripLogs 
                    busId={bus.id} 
                    logs={logs}
                    setLogs={setLogs}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const translateStage = (stage: TripStage): string => {
  const translations = {
    'storage_to_hotel': 'من المخزن إلى الفندق',
    'hotel_to_mashaar': 'من الفندق إلى المشاعر',
    'mashaar_to_hotel': 'من المشاعر إلى الفندق',
    'stage_completed': 'اكتملت المرحلة'
  }
  return translations[stage] || stage
}

const TripStageLogger = ({ bus, onUpdate, onLogAdded, logs }: { 
  bus: Bus, 
  onUpdate: () => void,
  onLogAdded: () => void,
  logs: TripLog[] 
}) => {
  const [notes, setNotes] = useState('')
  const [currentStageNumber, setCurrentStageNumber] = useState(1)
  
  const lastStage = logs.length > 0 ? logs[0].stage : undefined
  const [isStageCompleted, setIsStageCompleted] = useState(false)

  const getNextStage = (lastStage?: TripStage): TripStage => {
    if (!lastStage || lastStage === 'stage_completed') return 'hotel_to_mashaar'
    if (lastStage === 'hotel_to_mashaar') return 'mashaar_to_hotel'
    if (lastStage === 'mashaar_to_hotel') return 'hotel_to_mashaar'
    return 'hotel_to_mashaar'
  }

  const getRouteLabel = (lastStage?: TripStage): TripRoute => {
    if (!lastStage || lastStage === 'stage_completed') {
      return {
        from: 'hotel',
        to: 'mashaar',
        label: 'من الفندق إلى المشاعر'
      }
    }
    if (lastStage === 'hotel_to_mashaar') {
      return {
        from: 'mashaar',
        to: 'hotel',
        label: 'من المشاعر إلى الفندق'
      }
    }
    if (lastStage === 'mashaar_to_hotel') {
      return {
        from: 'hotel',
        to: 'mashaar',
        label: 'من الفندق إلى المشاعر'
      }
    }
    return {
      from: 'hotel',
      to: 'mashaar',
      label: 'من الفندق إلى المشاعر'
    }
  }

  const handleLogStage = async (stage: TripStage) => {
    try {
      if (stage === 'stage_completed') {
        const { error: busError } = await supabase
          .from('buses')
          .update({
            trip_status: 'waiting',
            bus_status: 'arrived',
            departure_time: null,
            arrival_time: new Date().toISOString()
          })
          .eq('id', bus.id)

        if (busError) throw busError
      }

      // تسجيل المرحلة
      const { error: logError } = await supabase
        .from('trip_logs')
        .insert([{
          bus_id: bus.id,
          stage,
          notes,
          stage_number: currentStageNumber,
          is_completed: stage === 'stage_completed',
          timestamp: new Date().toISOString()
        }])

      if (logError) throw logError
      
      onLogAdded() // تحديث السجلات مباشرة
      
      toast.success('تم إنهاء المرحلة وإعادة الباص للخدمة')
      
      setNotes('')
      if (stage !== 'stage_completed') {
        setCurrentStageNumber(prev => prev + 1)
      }
      
      onUpdate()
    } catch (error) {
      console.error('Error:', error)
      toast.error('حدث خطأ أثناء تسجيل المرحلة')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => handleLogStage(getNextStage(lastStage))}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isStageCompleted}
        >
          {getRouteLabel(lastStage).label}
        </button>
        
        <button
          onClick={() => handleLogStage('stage_completed')}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isStageCompleted}
        >
          إنهاء المرحلة
        </button>
      </div>
      
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="ملاحظات إضافية (اختياري)"
        className="w-full p-2 border rounded-md disabled:bg-gray-100"
        rows={2}
        disabled={isStageCompleted}
      />
    </div>
  )
}

const TripLogs = ({ 
  busId, 
  logs,
  setLogs 
}: { 
  busId: string,
  logs: TripLog[],
  setLogs: (logs: TripLog[]) => void
}) => {
  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div 
          key={log.id} 
          className={`border-r-4 pr-4 py-2 ${
            log.stage === 'stage_completed' 
              ? 'border-green-500' 
              : 'border-blue-500'
          }`}
        >
          <div className="font-medium">
            {translateStage(log.stage)}
            {log.is_completed && ' ✓'}
          </div>
          <div className="text-sm text-gray-600">
            {new Date(log.timestamp).toLocaleString('ar-SA')}
          </div>
          {log.notes && (
            <div className="text-sm text-gray-500 mt-1">{log.notes}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export const StatusBadge = ({ status }: { status: Bus['trip_status'] }) => {
  const statusConfig = {
    waiting: { 
      text: 'في انتظار الانطلاق', 
      class: 'bg-yellow-100 text-yellow-800' 
    },
    in_progress: { 
      text: 'اكتملت المرحلة',
      class: 'bg-blue-100 text-blue-800' 
    },
    completed: { 
      text: 'اكتملت المرحلة',
      class: 'bg-green-100 text-green-800' 
    },
    cancelled: { 
      text: 'ملغاة', 
      class: 'bg-red-100 text-red-800' 
    }
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[status].class}`}>
      {statusConfig[status].text}
    </span>
  )
} 