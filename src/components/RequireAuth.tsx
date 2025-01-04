import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAuthorization } from '../hooks/useAuthorization'

interface RequireAuthProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { user, loading } = useAuth()
  const { userRole } = useAuthorization()
  const navigate = useNavigate()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    console.log('Current user:', user)
    console.log('User role:', userRole)
    console.log('Allowed roles:', allowedRoles)
    
    if (!loading) {
      if (!user) {
        console.log('No user, redirecting to login')
        navigate('/login')
      } else if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        console.log('User role not allowed:', userRole)
        navigate('/')
      } else if (userRole) {
        console.log('User authorized with role:', userRole)
        setIsAuthorized(true)
      }
    }
  }, [user, userRole, loading, navigate, allowedRoles])

  if (loading) {
    return <div>جاري التحميل...</div>
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
} 