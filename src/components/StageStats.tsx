import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function StageStats() {
  const [stats, setStats] = useState({
    totalAlerts: 0,
    unresolvedAlerts: 0,
    lastCheck: ''
  })

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5 * 60 * 1000) // تحديث كل 5 دقائق
    
    return () => clearInterval(interval)
  }, [])

  async function fetchStats() {
    try {
      // جلب إجمالي التنبيهات
      const { count: totalAlerts } = await supabase
        .from('stage_alerts')
        .select('*', { count: 'exact' })

      // جلب التنبيهات غير المحلولة
      const { count: unresolvedAlerts } = await supabase
        .from('stage_alerts')
        .select('*', { count: 'exact' })
        .eq('is_resolved', false)

      // جلب آخر فحص
      const { data: lastLog } = await supabase
        .from('stage_monitoring_logs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)

      setStats({
        totalAlerts: totalAlerts || 0,
        unresolvedAlerts: unresolvedAlerts || 0,
        lastCheck: lastLog?.[0]?.created_at || ''
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900">إجمالي التنبيهات</h3>
        <p className="text-3xl font-bold text-primary-600">{stats.totalAlerts}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900">تنبيهات تحتاج مراجعة</h3>
        <p className="text-3xl font-bold text-yellow-600">{stats.unresolvedAlerts}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900">آخر فحص</h3>
        <p className="text-lg text-gray-600">
          {stats.lastCheck ? new Date(stats.lastCheck).toLocaleString('ar-SA') : 'لا يوجد'}
        </p>
      </div>
    </div>
  )
} 