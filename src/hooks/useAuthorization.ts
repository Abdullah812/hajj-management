import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export function useAuthorization() {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'staff' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      checkUserRole()
    } else {
      setLoading(false)
      setUserRole(null)
    }
  }, [user])

  async function checkUserRole() {
    try {
      console.log('Checking role for user:', user?.id)

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

      if (error) {
        console.error('Error fetching role:', error)
        throw error
      }

      console.log('Role data received:', data)
      setUserRole(data.role)
      
    } catch (error) {
      console.error('Error in checkUserRole:', error)
      setUserRole(null)
    } finally {
      setLoading(false)
    }
  }

  return {
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isStaff: userRole === 'staff',
    hasRole: (roles: ('admin' | 'manager' | 'staff')[]) => 
      roles.includes(userRole || 'staff'),
    userRole,
    loading
  }
} 
