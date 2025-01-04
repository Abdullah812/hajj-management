import { useAuthorization } from '../hooks/useAuthorization'

export function PublicPage() {
  const { userRole, loading } = useAuthorization()
  console.log('Public Page:', { userRole, loading })

  if (loading) return <div>جاري التحميل...</div>

  return (
    <div>
      <h1>الصفحة العامة</h1>
      <p>مرحباً بك في الصفحة العامة</p>
      <p>دورك: {userRole}</p>
    </div>
  )
} 