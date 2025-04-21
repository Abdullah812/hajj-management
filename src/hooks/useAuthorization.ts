import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'

interface User extends SupabaseUser {
  center_id?: number | null
}

// تخزين مؤقت للأدوار
const roleCache = new Map<string, string>()

export function useAuthorization(centerId?: number) {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'staff' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isSubscribed = true

    if (user) {
      // التحقق من التخزين المؤقت أولاً
      const cachedRole = roleCache.get(user.id)
      if (cachedRole) {
        setUserRole(cachedRole as 'admin' | 'manager' | 'staff')
        setLoading(false)
      } else {
        checkUserRole(isSubscribed)
      }
    } else {
      setLoading(false)
      setUserRole(null)
    }

    return () => {
      isSubscribed = false
    }
  }, [user])

  async function checkUserRole(isSubscribed = true) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, center_id')
        .eq('id', user?.id)
        .single()

      if (error) throw error
      if (data && isSubscribed) {
        roleCache.set(user?.id as string, data.role)
        setUserRole(data.role)
        if (user) {
          ;(user as User).center_id = data.center_id || null
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error)
    }
  }
  const isManager = userRole === 'manager' || 
    (userRole === 'staff' && (user as User)?.center_id === centerId && centerId != null)

  return {
    isAdmin: userRole === 'admin',
    isManager: isManager,
    isStaff: userRole === 'staff',
    hasRole: (roles: ('admin' | 'manager' | 'staff')[]) => roles.includes(userRole || 'staff'),
    userRole,
    loading
  }
} 
