import { useAuthorization } from '../hooks/useAuthorization'

export function AdminDashboard() {
  const { isAdmin, loading, userRole } = useAuthorization()
  console.log('Admin Dashboard:', { isAdmin, loading, userRole })

  if (loading) return <div>جاري التحميل...</div>

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">صفحة المدير فقط</p>
        <p className="text-sm text-gray-400">دورك الحالي: {userRole}</p>
      </div>
    )
  }

  return (
    <div>
      <h1>لوحة تحكم المدير</h1>
      <p>مرحباً بك في لوحة تحكم المدير</p>
    </div>
  )
} 