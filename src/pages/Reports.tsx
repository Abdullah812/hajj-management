import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  DocumentChartBarIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon 
} from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'

type ReportType = 'pilgrims' | 'centers' | 'stages'
type DateRange = 'today' | 'week' | 'month' | 'custom'
type StatCard = {
  title: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease'
}

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('pilgrims')
  const [dateRange, setDateRange] = useState<DateRange>('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']
  const [stats, setStats] = useState<StatCard[]>([])

  async function generateReport() {
    setLoading(true)
    try {
      let queryBuilder = supabase.from(reportType)
      let query

      // إضافة الجداول المرتبطة حسب نوع التقرير
      switch (reportType) {
        case 'pilgrims':
          query = queryBuilder.select(`
            *,
            center:centers(name),
            stage:stages(name)
          `)
          break
        case 'centers':
          query = queryBuilder.select(`
            *,
            manager:profiles(full_name)
          `)
          break
        case 'stages':
          query = queryBuilder.select('*')
          break
      }

      // إضافة فلتر التاريخ
      let fromDate = new Date()
      switch (dateRange) {
        case 'today':
          fromDate = new Date()
          fromDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          fromDate.setDate(fromDate.getDate() - 7)
          break
        case 'month':
          fromDate.setMonth(fromDate.getMonth() - 1)
          break
        case 'custom':
          if (startDate && endDate) {
            query = query
              .gte('created_at', startDate)
              .lte('created_at', endDate)
          }
          break
      }

      if (dateRange !== 'custom') {
        query = query.gte('created_at', fromDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setData(data || [])
    } catch (error) {
      console.error('Error generating report:', error)
      alert('حدث خطأ أثناء إنشاء التقرير')
    } finally {
      setLoading(false)
    }
  }

  function exportToExcel() {
    try {
      // تحويل البيانات إلى تنسيق مناسب للتصدير
      const exportData = data.map(row => {
        const newRow: any = {}
        for (const [key, value] of Object.entries(row)) {
          // تحويل الكائنات إلى نص
          newRow[key] = typeof value === 'object' ? JSON.stringify(value) : value
        }
        return newRow
      })

      // إنشاء ورقة عمل
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // إنشاء مصنف عمل
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      
      // تصدير الملف
      XLSX.writeFile(wb, `report-${reportType}-${new Date().toISOString()}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('حدث خطأ أثناء التصدير إلى Excel')
    }
  }

  // دالة لتحضير بيانات الرسم البياني
  function prepareChartData() {
    if (!data.length) return []

    switch (reportType) {
      case 'pilgrims':
        // تجميع الحجاج حسب المركز
        return Object.entries(
          data.reduce((acc: any, curr) => {
            const centerName = curr.center?.name || 'غير محدد'
            acc[centerName] = (acc[centerName] || 0) + 1
            return acc
          }, {})
        ).map(([name, value]) => ({ name, value }))

      case 'centers':
        // تجميع المراكز حسب الحالة
        return Object.entries(
          data.reduce((acc: any, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1
            return acc
          }, {})
        ).map(([name, value]) => ({ 
          name: name === 'active' ? 'نشط' : 'غير نشط', 
          value 
        }))

      case 'stages':
        // تجميع المراحل حسب عدد الحجاج
        return data.map(stage => ({
          name: stage.name,
          value: stage.pilgrims_count || 0
        }))

      default:
        return []
    }
  }

  // دالة لحساب الإحصائيات
  async function calculateStats() {
    try {
      switch (reportType) {
        case 'pilgrims': {
          const { count: totalCount } = await supabase
            .from('pilgrims')
            .select('*', { count: 'exact', head: true })

          const { count: todayCount } = await supabase
            .from('pilgrims')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date().setHours(0,0,0,0))

          const { data: centerStats } = await supabase
            .from('centers')
            .select('id, capacity, pilgrims!inner(id)')

          const totalCapacity = centerStats?.reduce((sum, center) => sum + (center.capacity || 0), 0) || 0
          const totalOccupied = centerStats?.reduce((sum, center) => sum + (center.pilgrims?.length || 0), 0) || 0
          const occupancyRate = totalCapacity ? ((totalOccupied / totalCapacity) * 100).toFixed(1) : 0

          setStats([
            {
              title: 'إجمالي الحجاج',
              value: totalCount || 0,
              change: todayCount || 0,
              changeType: 'increase'
            },
            {
              title: 'نسبة الإشغال',
              value: `${occupancyRate}%`,
              changeType: Number(occupancyRate) > 80 ? 'increase' : 'decrease'
            }
          ])
          break
        }
        
        case 'centers': {
          const { data: totalCenters } = await supabase
            .from('centers')
            .select('id, status', { count: 'exact' })

          const activeCenters = totalCenters?.filter(c => c.status === 'active').length || 0
          
          setStats([
            {
              title: 'إجمالي المراكز',
              value: totalCenters?.length || 0
            },
            {
              title: 'المراكز النشطة',
              value: activeCenters,
              change: totalCenters?.length ? 
                Number(((activeCenters / totalCenters.length) * 100).toFixed(0)) : 0,
              changeType: 'increase'
            }
          ])
          break
        }

        case 'stages': {
          const { data: stagesData } = await supabase
            .from('stages')
            .select('id, pilgrims!inner(id)')

          const completedStages = stagesData?.filter(s => s.pilgrims?.length > 0).length || 0
          
          setStats([
            {
              title: 'إجمالي المراحل',
              value: stagesData?.length || 0
            },
            {
              title: 'المراحل المكتملة',
              value: completedStages,
              change: stagesData?.length ? 
                Number(((completedStages / stagesData.length) * 100).toFixed(0)) : 0,
              changeType: 'increase'
            }
          ])
          break
        }
      }
    } catch (error) {
      console.error('Error calculating stats:', error)
    }
  }

  // تحديث الإحصائيات عند تغيير نوع التقرير
  useEffect(() => {
    calculateStats()
  }, [reportType])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
        <button
          onClick={exportToExcel}
          className="btn btn-secondary"
          disabled={!data.length}
        >
          تصدير إلى Excel
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* اختيار نوع التقرير */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع التقرير
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setReportType('pilgrims')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
                  reportType === 'pilgrims' 
                    ? 'border-primary-500 bg-primary-50 text-primary-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <UserGroupIcon className="h-6 w-6 mb-2" />
                <span className="text-sm">الحجاج</span>
              </button>
              <button
                onClick={() => setReportType('centers')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
                  reportType === 'centers' 
                    ? 'border-primary-500 bg-primary-50 text-primary-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <BuildingOfficeIcon className="h-6 w-6 mb-2" />
                <span className="text-sm">المراكز</span>
              </button>
              <button
                onClick={() => setReportType('stages')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
                  reportType === 'stages' 
                    ? 'border-primary-500 bg-primary-50 text-primary-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <DocumentChartBarIcon className="h-6 w-6 mb-2" />
                <span className="text-sm">المراحل</span>
              </button>
            </div>
          </div>

          {/* اختيار نطاق التاريخ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نطاق التاريخ
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="input"
            >
              <option value="today">اليوم</option>
              <option value="week">آخر أسبوع</option>
              <option value="month">آخر شهر</option>
              <option value="custom">تخصيص</option>
            </select>
          </div>

          {/* تواريخ مخصصة */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={generateReport}
            className="btn btn-primary w-full"
            disabled={loading || (dateRange === 'custom' && (!startDate || !endDate))}
          >
            {loading ? 'جاري إنشاء التقرير...' : 'إنشاء التقرير'}
          </button>
        </div>
      </div>

      {/* عرض نتائج التقرير */}
      {data.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value: any, i) => (
                      <td
                        key={i}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* إضافة اختيار نوع الرسم البياني */}
      {data.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              الرسم البياني
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded ${
                  chartType === 'bar' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100'
                }`}
              >
                أعمدة
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`px-3 py-1 rounded ${
                  chartType === 'pie' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100'
                }`}
              >
                دائري
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[600px] h-[400px]">
              {chartType === 'bar' ? (
                <BarChart
                  width={600}
                  height={400}
                  data={prepareChartData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              ) : (
                <PieChart width={600} height={400}>
                  <Pie
                    data={prepareChartData()}
                    cx={300}
                    cy={200}
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={160}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {prepareChartData().map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              )}
            </div>
          </div>
        </div>
      )}

      {/* إضافة بطاقات الإحصائيات */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white shadow-sm rounded-lg p-6"
            >
              <div className="text-sm font-medium text-gray-500">
                {stat.title}
              </div>
              <div className="mt-2 flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </div>
                {stat.change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    stat.changeType === 'increase' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {stat.changeType === 'increase' ? '↑' : '↓'}
                    {stat.change}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 