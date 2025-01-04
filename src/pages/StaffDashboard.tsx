import { useAuthorization } from '../hooks/useAuthorization'

export function StaffDashboard() {
  const { isStaff, loading, userRole } = useAuthorization()
  console.log('Staff Dashboard:', { isStaff, loading, userRole })

  if (loading) return <div>جاري التحميل...</div>

  if (!isStaff) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">صفحة الموظفين فقط</p>
        <p className="text-sm text-gray-400">دورك الحالي: {userRole}</p>
      </div>
    )
  }

  return (
    <div>
      <h1>لوحة تحكم الموظفين</h1>
      <p>مرحباً بك في لوحة تحكم الموظفين</p>
    </div>
  )
} 