import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabase-admin'

type Center = {
  id: number
  name: string
}

type UserModalProps = {
  isOpen: boolean
  onClose: () => void
  user?: {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'manager' | 'staff'
    center_id: number | null
  }
  onSuccess: () => void
}

export function UserModal({ isOpen, onClose, user, onSuccess }: UserModalProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'manager' | 'staff'>('staff')
  const [centerId, setCenterId] = useState<string>('')
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCenters()
  }, [])

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setFullName(user.full_name)
      setPassword('')
      setRole(user.role)
      setCenterId(user.center_id?.toString() || '')
    } else {
      setEmail('')
      setFullName('')
      setPassword('')
      setRole('staff')
      setCenterId('')
    }
  }, [user])

  async function fetchCenters() {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select('id, name')
        .eq('status', 'active')

      if (error) throw error
      setCenters(data || [])
    } catch (error) {
      console.error('Error fetching centers:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !fullName || (!user && !password)) {
        throw new Error('يرجى تعبئة جميع الحقول المطلوبة')
      }

      if (role === 'manager' && !centerId) {
        throw new Error('يجب اختيار المركز لمدير المركز')
      }

      if (user?.id) {
        // تحديث مستخدم موجود
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { 
            email,
            password: password || undefined,
            user_metadata: { full_name: fullName }
          }
        )
        if (authError) throw authError

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            email,
            full_name: fullName,
            role,
            center_id: centerId ? parseInt(centerId) : null
          })
          .eq('id', user.id)

        if (profileError) throw profileError
      } else {
        // إنشاء مستخدم جديد
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: 'staff'
          }
        })

        if (createError) throw createError

        if (userData.user) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
              email,
              full_name: fullName,
              role: 'staff',
              center_id: centerId ? parseInt(centerId) : null
            })
            .eq('id', userData.user.id)

          if (profileError) throw profileError
        }
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg w-full max-w-md mx-4 p-6">
          <div className="absolute left-4 top-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            {user ? 'تحرير المستخدم' : 'إضافة مستخدم جديد'}
          </Dialog.Title>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                الاسم الكامل
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                كلمة المرور {user && '(اتركها فارغة إذا لم ترد تغييرها)'}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                الصلاحية
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'staff')}
                className="mt-1 input"
                disabled={loading}
              >
                <option value="staff">موظف</option>
                <option value="manager">مدير مركز</option>
                <option value="admin">مدير النظام</option>
              </select>
            </div>

            {(role === 'manager' || role === 'staff') && (
              <div>
                <label htmlFor="center">المركز</label>
                <select
                  id="center"
                  value={centerId}
                  onChange={(e) => setCenterId(e.target.value)}
                  required
                >
                  <option value="">اختر المركز</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'جاري الحفظ...' : user ? 'حفظ التغييرات' : 'إضافة المستخدم'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 