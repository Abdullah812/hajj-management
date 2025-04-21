import { useState, useEffect, useMemo } from 'react'
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
  Cell,
  ResponsiveContainer
} from 'recharts'
import { Table } from '../components/Table'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useUser } from '../contexts/AuthContext'
import { ExportPDFButton } from '../components/ReportPDF'

type ReportType = 'pilgrim_groups' | 'centers' | 'stages'
type DateRange = 'today' | 'week' | 'month' | 'custom'

// Types
interface SavedReport {
  id: string;
  name: string;
  type: ReportType;
  filters: any;
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
}

interface ScheduledReport {
  id: string;
  reportType: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  lastSent?: string;
}

interface ChartOptions {
  showValues: boolean;
  showPercentages: boolean;
  orientation: 'vertical' | 'horizontal';
  colorScheme: 'default' | 'blue' | 'green' | 'warm';
}

interface PilgrimGroup {
  id: number;
  name: string;
  status: string;
  created_at: string;
  current_pilgrims: number;
  departed_count: number;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  departed_pilgrims: number;
  required_departures: number;
  allocated_departures: number;
  pilgrim_group_id?: number;
  receive_from_stage_id?: number;
  area_id?: number;
  nationality: string;
  count: number;
  center_id: string;
}

interface Center {
  id: string;
  name: string;
  location: string;
  default_capacity: number;
  current_count: number;
  status: string;
  created_at: string;
  departed_pilgrims: number;
}

interface Stage {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  current_pilgrims: number;
  status: string;
  created_at: string;
  start_time: string;
  end_time: string;
  departed_pilgrims: number;
  required_departures: number;
  allocated_departures: number;
}

// إضافة دالة تنسيق التاريخ في بداية الملف
const formatDate = (date: string) => {
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date;
  }
};

export function Reports() {
  const { t } = useTranslation();
  useUser();
  const [reportType, setReportType] = useState<ReportType>('pilgrim_groups')
  const [dateRange, setDateRange] = useState<DateRange>('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')
  const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6'];
  const [stats, setStats] = useState<Array<{ title: string; value: string | number }>>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  
  const [] = useState(false);
  const [] = useState<SavedReport | null>(null);
  const [] = useState<ScheduledReport[]>([]);
  const [] = useState<ChartOptions>({
    showValues: true,
    showPercentages: true,
    orientation: 'vertical',
    colorScheme: 'default'
  });

  const memoizedChartData = useMemo(() => prepareChartData(), [data, reportType]);

  const renderChart = () => {
    if (!data.length) return null;
    
    const commonProps = {
      data: memoizedChartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    return chartType === 'bar' ? (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip 
            formatter={(value: number) => value.toLocaleString('ar-SA')}
            labelFormatter={(label) => String(label)}
          />
          <Legend />
          <Bar dataKey="value" name="العدد">
            {memoizedChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart {...commonProps}>
          <Pie
            data={memoizedChartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }) => {
              const displayValue = value.toLocaleString('ar-SA');
              const displayPercent = (percent * 100).toFixed(0);
              return `${name} (${displayValue} - ${displayPercent}%)`;
            }}
            outerRadius={160}
            dataKey="value"
            nameKey="name"
          >
            {memoizedChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => value.toLocaleString('ar-SA')}
            labelFormatter={(label) => String(label)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  async function generateReport() {
    setLoading(true);
    try {
      let query = supabase.from(reportType).select() as any;
      
      // إضافة فلتر التاريخ
      if (dateRange !== 'custom') {
        const now = new Date();
        let startDateTime = new Date();
        
        switch(dateRange) {
          case 'today':
            startDateTime.setHours(0,0,0,0);
            break;
          case 'week':
            startDateTime.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDateTime.setMonth(now.getMonth() - 1);
            break;
        }
        
        query = query.gte('created_at', startDateTime.toISOString());
      } else if (startDate && endDate) {
        query = query
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`);
      }
      
      // إضافة فلتر الحالة
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      // إضافة الترتيب
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

      if (reportType === 'pilgrim_groups') {
        query = query.select(`
          id,
          nationality,
          count,
          created_at,
          status,
          center_id,
          departed_count
        `) as any;
      } else if (reportType === 'centers') {
        query = query.select(`
          id,
          name,
          location,
          default_capacity,
          current_count,
          status,
          created_at,
          stage_id,
          departed_pilgrims
        `) as any;
      } else if (reportType === 'stages') {
        query = query.select(`
          id,
          name,
          start_date,
          end_date,
          current_pilgrims,
          status,
          created_at,
          start_time,
          end_time,
          departed_pilgrims,
          required_departures,
          allocated_departures
        `).order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      const arabicData = data.map((item: Record<string, any>) => {
        if (reportType === 'pilgrim_groups') {
          const pilgrimItem = item as unknown as PilgrimGroup;
          return {
            'المعرف': pilgrimItem.id,
            'الجنسية': pilgrimItem.nationality,
            'العدد': pilgrimItem.count?.toLocaleString('ar-SA') || '0',
            'الحالة': pilgrimItem.status === 'active' ? 'نشط' : 'غير نشط',
            'معرف المركز': pilgrimItem.center_id,
            'عدد المغادرين': pilgrimItem.departed_count?.toLocaleString('ar-SA') || '0',
            'تاريخ التسجيل': formatDate(pilgrimItem.created_at)
          };
        } else if (reportType === 'centers') {
          const centerItem = item as unknown as Center;
          return {
            'المعرف': centerItem.id,
            'الاسم': centerItem.name,
            'الموقع': centerItem.location,
            'السعة': centerItem.default_capacity?.toLocaleString('ar-SA') || '0',
            'العدد الحالي': centerItem.current_count?.toLocaleString('ar-SA') || '0',
            'الحالة': centerItem.status === 'active' ? 'نشط' : 'غير نشط',
            'المغادرون': centerItem.departed_pilgrims?.toLocaleString('ar-SA') || '0',
            'تاريخ الإنشاء': new Date(centerItem.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })
          };
        } else {
          const stageItem = item as unknown as Stage;
          return {
            'المعرف': stageItem.id,
            'اسم المرحلة': stageItem.name,
            'تاريخ البداية': new Date(stageItem.start_date).toLocaleDateString('ar-SA'),
            'تاريخ النهاية': new Date(stageItem.end_date).toLocaleDateString('ar-SA'),
            'وقت البداية': stageItem.start_time,
            'وقت النهاية': stageItem.end_time,
            'عدد الحجاج الحالي': stageItem.current_pilgrims?.toLocaleString('ar-SA') || '0',
            'عدد المغادرين': stageItem.departed_pilgrims?.toLocaleString('ar-SA') || '0',
            'المغادرات المطلوبة': stageItem.required_departures?.toLocaleString('ar-SA') || '0',
            'المغادرات المجدولة': stageItem.allocated_departures?.toLocaleString('ar-SA') || '0',
            'الحالة': stageItem.status === 'active' ? 'نشط' : 'غير نشط',
            'تاريخ الإنشاء': new Date(stageItem.created_at).toLocaleDateString('ar-SA')
          };
        }
      });

      setData(arabicData || []);
    } catch (error) {
      console.error('Error details:', error);
      toast.error('حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setLoading(false);
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
    if (!data.length) return [];

    switch (reportType) {
      case 'pilgrim_groups':
        return Object.entries(
          data.reduce((acc: any, curr) => {
            const status = curr['الحالة'] || 'غير محدد';
            const countStr = String(curr['عدد الحجاج']).replace(/[^\d]/g, '');
            const count = countStr === '' ? 0 : parseInt(countStr);
            acc[status] = (acc[status] || 0) + count;
            return acc;
          }, {})
        ).map(([name, value]) => ({
          name: String(name),
          value: value || 0,
          fill: COLORS[Math.floor(Math.random() * COLORS.length)]
        }));

      case 'centers':
        return Object.entries(
          data.reduce((acc: any, curr) => {
            const status = curr['الحالة'] || 'غير محدد';
            const countStr = String(curr['العدد الحالي']).replace(/[^\d]/g, '');
            const count = countStr === '' ? 0 : parseInt(countStr);
            acc[status] = (acc[status] || 0) + count;
            return acc;
          }, {})
        ).map(([name, value]) => ({
          name: String(name),
          value: value || 0,
          fill: COLORS[Math.floor(Math.random() * COLORS.length)]
        }));

      case 'stages':
        return data.map((stage, index) => {
          const countStr = String(stage['عدد الحجاج الحالي']).replace(/[^\d]/g, '');
          const count = countStr === '' ? 0 : parseInt(countStr);
          return {
            name: String(stage['اسم المرحلة'] || 'غير محدد'),
            value: count || 0,
            fill: COLORS[index % COLORS.length]
          };
        });

      default:
        return [];
    }
  }

  // دالة لحساب الإحصائيات
  async function calculateStats() {
    try {
      if (!reportType) return;
      
      const { data: rawData, error } = await supabase
        .from(reportType)
        .select('*');
        
      if (error) throw error;
      if (!rawData) return;

      let newStats: Array<{ title: string; value: string | number }> = [];
      
      switch (reportType) {
        case 'centers':
          const totalCenters = rawData?.length || 0;
          const activeCenters = rawData?.filter(c => c.status === 'active').length || 0;
          const totalCapacity = rawData?.reduce((sum, center) => sum + (center.default_capacity || 0), 0) || 0;
          const totalOccupied = rawData?.reduce((sum, center) => sum + (center.current_count || 0), 0) || 0;
          const occupancyRate = totalCapacity ? ((totalOccupied / totalCapacity) * 100).toFixed(1) : '0';

          newStats = [
            { title: 'إجمالي المراكز', value: totalCenters },
            { title: 'المراكز النشطة', value: activeCenters },
            { title: 'نسبة الإشغال', value: `${occupancyRate}%` }
          ];
          break;
        case 'pilgrim_groups':
          const totalGroups = rawData?.length || 0;
          const totalPilgrims = rawData?.reduce((sum, group) => sum + (group.current_pilgrims || 0), 0) || 0;
          const departedPilgrims = rawData?.reduce((sum, group) => sum + (group.departed_count || 0), 0) || 0;
          const departureRate = totalPilgrims ? ((departedPilgrims / totalPilgrims) * 100).toFixed(1) : '0';

          newStats = [
            { title: 'إجمالي المجموعات', value: totalGroups },
            { title: 'إجمالي الحجاج', value: totalPilgrims },
            { title: 'نسبة المغادرة', value: `${departureRate}%` }
          ];
          break;
        case 'stages':
          const totalStages = rawData?.length || 0;
          const activeStages = rawData?.filter(s => s.status === 'active').length || 0;
          const currentPilgrims = rawData?.reduce((sum, stage) => sum + (stage.current_pilgrims || 0), 0) || 0;
          const totalDepartedPilgrims = rawData?.reduce((sum, stage) => sum + (stage.departed_pilgrims || 0), 0) || 0;
          const completionRate = ((totalDepartedPilgrims / (currentPilgrims + totalDepartedPilgrims)) * 100).toFixed(1);

          newStats = [
            { title: 'إجمالي المراحل', value: totalStages },
            { title: 'المراحل النشطة', value: activeStages },
            { title: 'نسبة الإنجاز', value: `${completionRate}%` }
          ];
          break;
      }
      
      setStats(newStats);
    } catch (error) {
      console.error('Error calculating stats:', error);
      toast.error('حدث خطأ أثناء حساب الإحصائيات');
    }
  }

  // تحديث الإحصائيات عند تغيير نوع التقرير
  useEffect(() => {
    calculateStats()
  }, [reportType])

  // وظائف جديدة

  // إضافة التحديث المباشر
  useEffect(() => {
    const channel = supabase
      .channel('reports')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: reportType 
      }, () => {
        generateReport();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportType]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
        <div className="flex justify-between items-center mb-6">
          <div className="space-x-2 rtl:space-x-reverse">
            <button
              onClick={exportToExcel}
              className="btn btn-secondary"
              disabled={!data.length}
            >
              تصدير Excel
            </button>
            {data.length > 0 && stats.length > 0 && (
              <ExportPDFButton 
                data={data} 
                reportType={reportType} 
                stats={stats} 
              />
            )}
          </div>
          
          <div className="flex gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="input"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="input"
            >
              <option value="created_at">تاريخ الإنشاء</option>
              {reportType === 'pilgrim_groups' && <option value="current_pilgrims">عدد الحجاج الحالي</option>}
              {reportType === 'centers' && <option value="current_count">العدد الحالي</option>}
              {reportType === 'stages' && <option value="current_pilgrims">عدد الحجاج الحالي</option>}
            </select>
            
            <button
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
              }))}
              className="btn btn-icon"
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
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
                onClick={() => setReportType('pilgrim_groups')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
                  reportType === 'pilgrim_groups' 
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
              <option value="today">{t('reports.filters.today')}</option>
              <option value="week">{t('reports.filters.week')}</option>
              <option value="month">{t('reports.filters.month')}</option>
              <option value="custom">{t('reports.filters.custom')}</option>
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
        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6">
          <Table
            data={data}
            columns={Object.keys(data[0]).map(key => ({
              id: key,
              header: () => <span>{key}</span>,
              accessorKey: key,
              cell: info => {
                const value = info.getValue()
                return typeof value === 'object' ? JSON.stringify(value) : String(value)
              }
            }))}
          />
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
              {renderChart()}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}