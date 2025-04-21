import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { toast } from 'react-hot-toast'
import {
  ChartBarIcon,
  
  UserGroupIcon,
  TruckIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Bus {
  id: string
  bus_name: string
  driver_name: string
  driver_id: string
  bus_number: string
  plate_number: string
  plate_type: 'private' | 'commercial' | 'diplomatic' | 'taxi' | 'temporary'
  created_at: string
  center_id: string
  bus_status: 'in_transit' | 'arrived'
  bus_type: 'tawafa' | 'tas3eed'
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled'
  passenger_count: number
  departure_time: string | null
  arrival_time: string | null
  trip_status: 'waiting' | 'in_progress' | 'completed' | 'cancelled'
  latest_log?: TripLog
}

interface Center {
  id: string
  name: string
  status: 'active' | 'inactive'
}

interface TripLog {
  id: string
  bus_id: string
  stage: 'check_in' | 'boarding_started' | 'boarding_completed' | 'stage_completed'
  created_at: string
  passenger_count?: number
}


export function Buses() {
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    bus_name: '',
    driver_name: '',
    driver_id: '',
    bus_number: '',
    plate_number: '',
    plate_type: 'commercial' as Bus['plate_type'],
    center_id: '',
    bus_status: 'in_transit' as Bus['bus_status'],
    bus_type: 'tawafa' as 'tawafa' | 'tas3eed'
  })
  const [] = useState('')
  const [, setPlateFields] = useState({
    numbers: '',
    letter1: '',
    letter2: '',
    letter3: ''
  })
  const [editingBus, setEditingBus] = useState<Bus | null>(null)
  const [centers, setCenters] = useState<Center[]>([])
  const [statistics, setStatistics] = useState({
    totalBuses: 0,
    activeBuses: 0,
    tawafaBuses: 0,
    tas3eedBuses: 0,
    totalPassengers: 0
  })

  useEffect(() => {
    fetchBuses()
    fetchCenters()
  }, [])

  useEffect(() => {
    updateStatistics()
  }, [buses])

  useEffect(() => {
    if (centers.length > 0 && !formData.center_id) {
      setFormData(prev => ({
        ...prev,
        center_id: centers[0].id
      }))
    }
  }, [centers])

  async function fetchBuses() {
    try {
      // نجلب الباصات مع آخر سجلاتها في استعلام واحد
      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select('*')
        .order('created_at', { ascending: false })

      if (busesError) throw busesError

      // نجلب سجلات المراحل لكل الباصات
      const { data: logsData, error: logsError } = await supabase
        .from('trip_logs')
        .select('*')
        .in('bus_id', busesData.map(bus => bus.id))

      if (logsError) throw logsError

      // نجمع البيانات معاً
      const busesWithLogs = busesData.map(bus => {
        const busLogs = logsData.filter(log => log.bus_id === bus.id)
        const latestLog = busLogs.length > 0 
          ? busLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null

        return {
          ...bus,
          latest_log: latestLog
        }
      })

      setBuses(busesWithLogs)
    } catch (error) {
      console.error('Error fetching buses:', error)
      toast.error('حدث خطأ أثناء جلب البيانات')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCenters() {
    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .eq('status', 'active')
    
    if (error) {
      toast.error('خطأ في جلب المراكز')
      return
    }
    
    if (data) {
      setCenters(data)
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const busData = {
        bus_name: formData.bus_name,
        driver_name: formData.driver_name,
        driver_id: formData.driver_id,
        bus_number: formData.bus_number,
        center_id: formData.center_id,
        bus_type: formData.bus_type,
        bus_status: 'in_transit' as const,
        trip_status: 'waiting' as const,
        plate_number: formData.bus_number,
        plate_type: 'commercial' as const
      }

      if (editingBus) {
        const { error } = await supabase
          .from('buses')
          .update(busData)
          .eq('id', editingBus.id)

        if (error) throw error
        toast.success('تم تحديث الباص بنجاح')
      } else {
        const { error } = await supabase
          .from('buses')
          .insert([busData])

        if (error) throw error
        toast.success('تم إضافة الباص بنجاح')
      }

      setShowForm(false)
      setEditingBus(null)
      setFormData({
        bus_name: '',
        driver_name: '',
        driver_id: '',
        bus_number: '',
        plate_number: '',
        plate_type: 'commercial',
        center_id: '',
        bus_status: 'in_transit',
        bus_type: 'tawafa'
      })
      
      fetchBuses()
    } catch (error) {
      console.error('Error saving bus:', error)
      toast.error('حدث خطأ أثناء حفظ الباص')
    }
  }


  async function handleDelete(busId: string) {
    if (window.confirm('هل أنت متأكد من حذف هذا الباص؟')) {
      try {
        const { error } = await supabase
          .from('buses')
          .delete()
          .eq('id', busId)

        if (error) throw error
        
        alert('تم حذف الباص بنجاح')
        fetchBuses()
      } catch (error) {
        console.error('Error deleting bus:', error)
        alert('حدث خطأ أثناء جحذف الباص')
      }
    }
  }

  function handleEdit(bus: Bus) {
    setEditingBus(bus)
    setFormData({
      ...bus,
      bus_type: bus.bus_type || 'tawafa'
    })
    const [numbers, ...letters] = bus.plate_number.split(' ')
    setPlateFields({
      numbers,
      letter1: letters[0] || '',
      letter2: letters[1] || '',
      letter3: letters[2] || ''
    })
    setShowForm(true)
  }




  const updateStatistics = () => {
    setStatistics({
      totalBuses: buses.length,
      activeBuses: buses.filter(b => b.status === 'in_progress').length,
      tawafaBuses: buses.filter(b => b.bus_type === 'tawafa').length,
      tas3eedBuses: buses.filter(b => b.bus_type === 'tas3eed').length,
      totalPassengers: buses.reduce((sum, bus) => sum + (bus.passenger_count || 0), 0)
    });
  };

  const StatisticsPanel = () => (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <StatCard
        title="إجمالي الباصات"
        value={statistics.totalBuses}
        icon={<TruckIcon className="h-6 w-6" />}
      />
      <StatCard
        title="الباصات النشطة"
        value={statistics.activeBuses}
        icon={<ChartBarIcon className="h-6 w-6" />}
      />
      <StatCard
        title="باصات التروية"
        value={statistics.tawafaBuses}
        icon={<TruckIcon className="h-6 w-6" />}
      />
      <StatCard
        title="باصات التصعيد"
        value={statistics.tas3eedBuses}
        icon={<TruckIcon className="h-6 w-6" />}
      />
      <StatCard
        title="إجمالي الركاب"
        value={statistics.totalPassengers}
        icon={<UserGroupIcon className="h-6 w-6" />}
      />
    </div>
  );

  const handleDeparture = async (busId: string) => {
    const { error } = await supabase
      .from('buses')
      .update({ 
        bus_status: 'in_transit',
        trip_status: 'in_progress',
        departure_time: new Date().toISOString()
      })
      .eq('id', busId)
      .select()

    if (error) {
      console.error('Error details:', error)
      toast.error('حدث خطأ أثناء تسجيل مغادرة الباص')
      return
    }
        
    toast.success('تم تسجيل مغادرة الباص بنجاح')
    fetchBuses()
  }

  const handleArrival = async (busId: string) => {
    const { error } = await supabase
      .from('buses')
      .update({
        arrival_time: new Date().toISOString(),
        trip_status: 'waiting',
        bus_status: 'arrived',
        departure_time: null
      })
      .eq('id', busId)
      .select()

    if (error) {
      console.error('Error details:', error)
      toast.error('حدث خطأ أثناء تسجيل الوصول')
      return
    }
        
    toast.success('تم الوصول بنجاح')
    fetchBuses()
  }

  const getStageText = (stage: string) => {
    const stages = {
      check_in: 'تم التسجيل',
      boarding_started: 'بدأ الصعود',
      boarding_completed: 'اكتمل الصعود',
      stage_completed: 'اكتملت المرحلة',
      storage_to_hotel: 'من المخزن إلى الفندق'
    }
    return stages[stage as keyof typeof stages] || stage
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <StatisticsPanel />

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الباصات</h1>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              إضافة باص جديد
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-r-transparent"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">جاري التحميل...</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {buses.map((bus) => (
                <div key={bus.id} 
                     className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl
                                transition-all duration-300 transform hover:-translate-y-1
                                border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="p-2 bg-primary-50 rounded-lg">
                          <TruckIcon className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {bus.bus_name}
                          </h3>
                          <p className="text-sm text-gray-500">رقم الباص: {bus.bus_number}</p>
                          <p className="text-sm text-gray-500">رقم اللوحة: {bus.plate_number}</p>
                        </div>
                      </div>
                      <StatusBadge status={bus.trip_status} />
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-sm text-gray-500 mb-1">السائق</div>
                        <div className="font-medium">{bus.driver_name}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-sm text-gray-500 mb-1">الرقم الترددي</div>
                        <div className="font-medium">{bus.driver_id}</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">المركز</span>
                        <span className="font-medium">
                          {centers.find(c => c.id === bus.center_id)?.name || 'غير محدد'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">نوع الباص</span>
                        <span className={`px-2 py-1 rounded-full text-xs 
                          ${bus.bus_type === 'tawafa' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {bus.bus_type === 'tawafa' ? 'تروية' : 'تصعيد'}
                        </span>
                      </div>
                      {bus.passenger_count > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">عدد الركاب</span>
                          <span className="font-medium">{bus.passenger_count}</span>
                        </div>
                      )}
                      {bus.departure_time && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">وقت المغادرة</span>
                          <span className="font-medium">{new Date(bus.departure_time).toLocaleTimeString('ar-SA')}</span>
                        </div>
                      )}
                      {bus.arrival_time && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">وقت الوصول</span>
                          <span className="font-medium">{new Date(bus.arrival_time).toLocaleTimeString('ar-SA')}</span>
                        </div>
                      )}
                    </div>

                    {/* سجل المرحلة */}
                    {bus.latest_log && (
                      <div className="mt-4 px-5">
                        <div className="flex items-center gap-2 mb-2">
                          <ClockIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-600">آخر تحديث للمرحلة</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">
                                {getStageText(bus.latest_log.stage)}
                              </span>
                              <span className="text-xs text-gray-500 dir-ltr">
                                {new Date(bus.latest_log.created_at).toLocaleString('ar-SA', {
                                  year: 'numeric',
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                  second: 'numeric',
                                  hour12: true
                                })}
                              </span>
                            </div>
                            {bus.latest_log.passenger_count && (
                              <div className="text-sm text-gray-500">
                                عدد الركاب: {bus.latest_log.passenger_count}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-end gap-3">
                      {bus.trip_status === 'waiting' && (
                        <button
                          onClick={() => handleDeparture(bus.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg 
                                   hover:bg-green-700 transition-colors duration-200"
                        >
                          انطلاق
                        </button>
                      )}
                      {bus.trip_status === 'in_progress' && (
                        <button
                          onClick={() => handleArrival(bus.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg 
                                   hover:bg-blue-700 transition-colors duration-200"
                        >
                          وصول
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(bus)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg 
                                 border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(bus.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg 
                                 hover:bg-red-100 transition-colors duration-200"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Transition appear show={showForm} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => setShowForm(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl 
                                 bg-white dark:bg-gray-800 p-6 text-right align-middle 
                                 shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <Dialog.Title 
                      as="h3" 
                      className="text-lg font-semibold text-gray-900 dark:text-white"
                    >
                      {editingBus ? 'تعديل بيانات الباص' : 'إضافة باص جديد'}
                    </Dialog.Title>
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                            <span>الشركة:</span>
                          </div>
                          <span className="text-blue-500 text-xs">{formData.bus_name || 'لم يتم التحديد'}</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={formData.bus_name}
                            onChange={e => setFormData(prev => ({ ...prev, bus_name: e.target.value }))}
                            className="block w-full pl-4 pr-10 py-3 rounded-lg border border-blue-200 
                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                     bg-blue-50/30 transition-colors duration-200"
                            placeholder="أدخل اسم الشركة"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            <span>السائق:</span>
                          </div>
                          <span className="text-green-500 text-xs">{formData.driver_name || 'لم يتم التحديد'}</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={formData.driver_name}
                            onChange={e => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                            className="block w-full pl-4 pr-10 py-3 rounded-lg border border-green-200 
                                     focus:ring-2 focus:ring-green-500 focus:border-green-500 
                                     bg-green-50/30 transition-colors duration-200"
                            placeholder="أدخل اسم السائق"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          الرقم الترددي
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.driver_id}
                          onChange={e => setFormData(prev => ({ ...prev, driver_id: e.target.value }))}
                          className="block w-full px-4 py-3 rounded-lg border border-gray-300 
                                   dark:border-gray-600 focus:ring-2 focus:ring-primary-500 
                                   focus:border-primary-500 dark:bg-gray-700 dark:text-white 
                                   transition-colors duration-200"
                          placeholder="أدخل الرقم الترددي"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          رقم الباص
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.bus_number}
                          onChange={e => setFormData(prev => ({ ...prev, bus_number: e.target.value }))}
                          className="block w-full px-4 py-3 rounded-lg border border-gray-300 
                                   dark:border-gray-600 focus:ring-2 focus:ring-primary-500 
                                   focus:border-primary-500 dark:bg-gray-700 dark:text-white 
                                   transition-colors duration-200"
                          placeholder="أدخل رقم الباص"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          المركز
                        </label>
                        <select
                          value={formData.center_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, center_id: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          required
                        >
                          <option value="">اختر المركز</option>
                          {centers.map(center => (
                            <option key={center.id} value={center.id}>
                              {center.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          نوع الباص
                        </label>
                        <select
                          value={formData.bus_type}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            bus_type: e.target.value as 'tawafa' | 'tas3eed'
                          }))}
                          className="block w-full px-4 py-3 rounded-lg border border-gray-300"
                          required
                        >
                          <option value="tawafa">تروية</option>
                          <option value="tas3eed">تصعيد</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300
                                 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600
                                 hover:bg-primary-700 rounded-lg transition-colors duration-200"
                      >
                        {editingBus ? 'تحديث' : 'إضافة'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

const StatCard = ({ 
  title, 
  value, 
  icon 
}: { 
  title: string;
  value: number;
  icon: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="text-primary-500">{icon}</div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: Bus['trip_status'] }) => {
  const statusConfig = {
    waiting: { 
      text: 'في انتظار الانطلاق', 
      class: 'bg-yellow-100 text-yellow-800' 
    },
    in_progress: { 
      text: 'في المرحلة',
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