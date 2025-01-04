import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Stage } from '../types';

interface Pilgrim {
  id: string;
  full_name: string;
  passport_number: string;
  status: 'registered' | 'arrived' | 'completed' | 'cancelled';
  stage_id: string;
  center_id: string;
}

interface Center {
  id: string;
  name: string;
  location: string;
  capacity: number;
  stage_id: string;
  stage?: Stage;
  current_count: number;
}

export function CenterDashboard() {
  const [center, setCenter] = useState<Center | null>(null)
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPilgrims, setSelectedPilgrims] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'arrived' | 'completed' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function getCurrentUserCenter() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) throw new Error('لم يتم تسجيل الدخول')

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('center_id, centers ( id, name )')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        
        if (!profile?.center_id) {
          setLoading(false)
          return
        }

        fetchCenter(Number(profile.center_id))
      } catch (error) {
        console.error('Error getting user center:', error)
        setLoading(false)
      }
    }

    getCurrentUserCenter()
  }, [])

  async function fetchCenter(centerId: number) {
    try {
      const { data: centerData, error: centerError } = await supabase
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
        .eq('id', centerId)
        .single()

      if (centerError) throw centerError

      const pilgrimsQuery = supabase
        .from('pilgrims')
        .select('*')
        .eq('center_id', centerData.id)

      if (centerData.stage_id) {
        pilgrimsQuery.eq('stage_id', centerData.stage_id)
      }

      const { data: pilgrimsData, error: pilgrimsError } = await pilgrimsQuery

      if (pilgrimsError) throw pilgrimsError

      setCenter(centerData)
      setPilgrims(pilgrimsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('حدث خطأ أثناء جلب البيانات')
    } finally {
      setLoading(false)
    }
  }

  async function updatePilgrimsStatus(newStatus: 'completed' | 'cancelled') {
    if (!selectedPilgrims.length) return;

    const action = newStatus === 'completed' ? 'مغادرة' : 'إلغاء تسجيل';
    const count = selectedPilgrims.length;
    
    if (!window.confirm(`هل أنت متأكد من ${action} ${count} حاج؟`)) {
      return;
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('pilgrims')
        .update({ status: newStatus })
        .in('id', selectedPilgrims)

      if (error) throw error

      // تحديث القائمة
      await fetchCenter(Number(center?.id))
      setSelectedPilgrims([])
    } catch (error) {
      console.error('Error updating pilgrims:', error)
      alert('حدث خطأ أثناء تحديث حالة الحجاج')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!center) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">لم يتم تعيين مركز لك بعد</h2>
        <p className="mt-2 text-gray-600">يرجى التواصل مع المشرف لتعيين مركز لك</p>
      </div>
    )
  }

  const filteredPilgrims = pilgrims.filter(pilgrim => {
    if (filter === 'all') return true;
    return pilgrim.status === filter;
  });

  const searchedPilgrims = filteredPilgrims.filter(pilgrim => 
    pilgrim.full_name.includes(searchQuery) || 
    pilgrim.passport_number.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{center?.name}</h1>
              <p className="mt-1 text-sm text-gray-500">{center?.location}</p>
            </div>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="text-sm text-gray-500">
                المرحلة الحالية: <span className="font-medium">{center?.stage?.name}</span>
              </div>
              <div className="text-sm text-gray-500">
                عدد الحجاج: <span className="font-medium">{pilgrims.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={() => updatePilgrimsStatus('completed')}
              disabled={!selectedPilgrims.length}
              className="btn btn-primary"
            >
              تأكيد المغادرة
            </button>
            <button
              onClick={() => updatePilgrimsStatus('cancelled')}
              disabled={!selectedPilgrims.length}
              className="btn btn-secondary"
            >
              إلغاء التسجيل
            </button>
          </div>
          <div className="text-sm text-gray-500">
            تم تحديد {selectedPilgrims.length} حاج
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md ${
                filter === 'all' ? 'bg-primary-100 text-primary-800' : 'bg-white text-gray-600'
              }`}
            >
              الكل ({pilgrims.length})
            </button>
            <button
              onClick={() => setFilter('arrived')}
              className={`px-4 py-2 rounded-md ${
                filter === 'arrived' ? 'bg-green-100 text-green-800' : 'bg-white text-gray-600'
              }`}
            >
              موجود ({pilgrims.filter(p => p.status === 'arrived').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-md ${
                filter === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-600'
              }`}
            >
              غادر ({pilgrims.filter(p => p.status === 'completed').length})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-md ${
                filter === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-white text-gray-600'
              }`}
            >
              ملغي ({pilgrims.filter(p => p.status === 'cancelled').length})
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="max-w-md">
            <label htmlFor="search" className="sr-only">بحث</label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="input pl-10 w-full"
                placeholder="بحث بالاسم أو رقم الجواز..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Pilgrims Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPilgrims(pilgrims.map(p => p.id))
                      } else {
                        setSelectedPilgrims([])
                      }
                    }}
                    checked={selectedPilgrims.length === pilgrims.length}
                  />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الاسم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  رقم الجواز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {searchedPilgrims.map((pilgrim) => (
                <tr key={pilgrim.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedPilgrims.includes(pilgrim.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPilgrims([...selectedPilgrims, pilgrim.id])
                        } else {
                          setSelectedPilgrims(selectedPilgrims.filter(id => id !== pilgrim.id))
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pilgrim.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pilgrim.passport_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      pilgrim.status === 'arrived' ? 'bg-green-100 text-green-800' :
                      pilgrim.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      pilgrim.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pilgrim.status === 'arrived' ? 'موجود' :
                       pilgrim.status === 'completed' ? 'غادر' :
                       pilgrim.status === 'cancelled' ? 'ملغي' :
                       'مسجل'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm font-medium text-gray-500">السعة الكلية</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{center?.capacity}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm font-medium text-gray-500">الحجاج الموجودون</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              {pilgrims.filter(p => p.status === 'arrived').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm font-medium text-gray-500">المغادرون</div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">
              {pilgrims.filter(p => p.status === 'completed').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm font-medium text-gray-500">نسبة الإشغال</div>
            <div className="mt-1 text-2xl font-semibold text-purple-600">
              {Math.round((pilgrims.filter(p => p.status === 'arrived').length / (center?.capacity || 1)) * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 