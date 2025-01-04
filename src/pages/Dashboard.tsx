import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { StatsCard } from '../components/StatsCard'
import { UserGroupIcon, BuildingOfficeIcon, ClockIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AIPredictions } from '../components/AIPredictions'

interface Pilgrim {
  id: string;
  full_name: string;
  passport_number: string;
  status: 'arrived' | 'pending' | 'unknown';
  center?: {
    name: string;
  };
}

interface Stage {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  progress?: number;
}

interface Stats {
  totalPilgrims: number;
  activePilgrims: number;
  totalCenters: number;
  activeStages: number;
  dailyStats: any[];
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalPilgrims: 0,
    activePilgrims: 0,
    totalCenters: 0,
    activeStages: 0,
    dailyStats: []
  })
  const [loading, setLoading] = useState(true)
  const [recentPilgrims, setRecentPilgrims] = useState<Pilgrim[]>([])
  const [currentStages, setCurrentStages] = useState<Stage[]>([])
  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 90>(30)
  const [centers, setCenters] = useState<Array<{
    id: number;
    name: string;
    capacity: number;
    current_count: number;
  }>>([])

  const stageData = {
    id: 0,
    name: '',
    max_pilgrims: 0,
    current_pilgrims: 0
  };

  useEffect(() => {
    fetchStats()
    fetchRecentPilgrims()
    fetchCurrentStages()
    fetchCenterAndStageData()
  }, [])

  async function fetchStats() {
    try {
      const [pilgrimsResponse, centersResponse, stagesResponse] = await Promise.all([
        supabase.from('pilgrims').select('*', { count: 'exact' }),
        supabase.from('centers').select('*', { count: 'exact' }),
        supabase.from('stages').select('*').eq('status', 'active')
      ])

      const dailyStatsResponse = await supabase
        .from('pilgrims')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - chartPeriod * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at')

      const dailyStats = dailyStatsResponse.data?.reduce((acc: { [key: string]: number }, curr) => {
        const date = new Date(curr.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {})

      const allDates = [...Array(chartPeriod)].map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (chartPeriod - 1 - i))
        return d.toISOString().split('T')[0]
      })

      const formattedDailyStats = allDates.map(date => ({
        date,
        count: dailyStats?.[date] || 0
      }))

      setStats({
        totalPilgrims: pilgrimsResponse.count || 0,
        activePilgrims: pilgrimsResponse.data?.filter(p => p.status === 'arrived').length || 0,
        totalCenters: centersResponse.count || 0,
        activeStages: stagesResponse.data?.length || 0,
        dailyStats: formattedDailyStats
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecentPilgrims() {
    try {
      const { data } = await supabase
        .from('pilgrims')
        .select(`
          *,
          center:centers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)
      
      setRecentPilgrims(data || [])
    } catch (error) {
      console.error('Error fetching recent pilgrims:', error)
    }
  }

  async function fetchCurrentStages() {
    try {
      const { data } = await supabase
        .from('stages')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: false })
      
      setCurrentStages(data || [])
    } catch (error) {
      console.error('Error fetching current stages:', error)
    }
  }

  async function fetchCenterAndStageData() {
    try {
      const { data: centersData, error } = await supabase
        .from('centers')
        .select('id, name, capacity');
      
      if (error) throw error;
      
      const formattedCenters = centersData?.map(center => ({
        id: center.id,
        name: center.name,
        capacity: center.capacity,
        current_count: 0
      })) || [];
      
      setCenters(formattedCenters);
    } catch (error) {
      console.error('Error fetching centers:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة التحكم</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">نظرة عامة على النظام</p>
            </div>
            
            <button
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="إجمالي الحجاج"
              value={stats.totalPilgrims}
              icon={<UserGroupIcon className="h-6 w-6 text-primary-600" />}
              loading={loading}
              trend={{
                value: "+12%",
                label: "من الشهر الماضي",
                type: "increase"
              }}
            />
            <StatsCard
              title="الحجاج النشطين"
              value={stats.activePilgrims}
              icon={<UserGroupIcon className="h-6 w-6 text-green-600" />}
              loading={loading}
              trend={{
                value: "+5%",
                label: "من الأسبوع الماضي",
                type: "increase"
              }}
            />
            <StatsCard
              title="المراكز"
              value={stats.totalCenters}
              icon={<BuildingOfficeIcon className="h-6 w-6 text-blue-600" />}
              loading={loading}
            />
            <StatsCard
              title="المراحل النشطة"
              value={stats.activeStages}
              icon={<ClockIcon className="h-6 w-6 text-purple-600" />}
              loading={loading}
            />
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">إحصائيات التسجيل اليومية</h2>
              <select 
                className="text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md"
                value={chartPeriod}
                onChange={(e) => setChartPeriod(Number(e.target.value) as 7 | 30 | 90)}
              >
                <option value={7}>آخر 7 أيام</option>
                <option value={30}>آخر 30 يوم</option>
                <option value={90}>آخر 3 أشهر</option>
              </select>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ar-SA', { 
                        month: chartPeriod > 30 ? 'short' : 'numeric',
                        day: 'numeric'
                      })}
                      stroke="#6B7280"
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={{ stroke: '#4B5563' }}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={{ stroke: '#4B5563' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('ar-SA', { 
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      formatter={(value) => [`${value} حاج`, "عدد التسجيلات"]}
                      contentStyle={{ 
                        direction: 'rtl',
                        textAlign: 'right',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#4F46E5" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Pilgrims */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">آخر الحجاج المسجلين</h2>
                  <a href="/pilgrims" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                    عرض الكل
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                  </a>
                </div>
                <div className="overflow-x-auto rounded-lg shadow">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">رقم الجواز</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المركز</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {recentPilgrims.map((pilgrim) => (
                        <tr key={pilgrim.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {pilgrim.full_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {pilgrim.passport_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {pilgrim.center?.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                              نشط
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Current Stages */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">المراحل الحالية</h2>
                  <a href="/stages" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                    عرض الكل
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                  </a>
                </div>
                <div className="space-y-4">
                  {currentStages.map((stage) => (
                    <div key={stage.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{stage.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(stage.start_date).toLocaleDateString('ar-SA')} - 
                            {new Date(stage.end_date).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          نشط
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div 
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-600"
                              style={{ width: `${stage.progress || 0}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-left">{stage.progress || 0}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <span className="text-gray-900 dark:text-white">جاري التحميل...</span>
          </div>
        </div>
      )}

      <AIPredictions 
        centers={centers} 
        stageData={stageData} 
      />
    </div>
  )
} 