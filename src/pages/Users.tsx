import { useEffect, useState } from 'react'
import { useAuthorization } from '../hooks/useAuthorization'
import { supabaseAdmin } from '../lib/supabase'

interface Center {
  id: string
  name: string
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
  center_id?: string | null
  created_at: string
}

type ModalType = 'delete' | 'password' | 'edit' | 'none';

interface ModalData {
  userId?: string;
  userName?: string;
  newPassword?: string;
  user?: User;
}

export function Users() {
  const auth = useAuthorization()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [centers, setCenters] = useState<Center[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [filterCenter, setFilterCenter] = useState<string>('')
  const [] = useState(false)
  const [modalType, setModalType] = useState<ModalType>('none');
  const [modalData, setModalData] = useState<ModalData>({});

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    async function fetchCenters() {
      const { data, error } = await supabaseAdmin
        .from('centers')
        .select('id, name')
        .order('name')

      if (!error && data) {
        setCenters(data)
      }
    }

    fetchCenters()
  }, [])

  async function fetchUsers() {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesCenter = !filterCenter || user.center_id === filterCenter;

    return matchesSearch && matchesRole && matchesCenter;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get('email') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string
    const centerId = role === 'manager' ? formData.get('center_id') : null

    try {
      const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-8),
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      })

      if (signUpError) throw signUpError
      if (!user) throw new Error('فشل إنشاء المستخدم')

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          email,
          full_name: fullName,
          role,
          center_id: centerId
        })

      if (profileError) throw profileError

      alert('تم إضافة المستخدم بنجاح')
      setSelectedUser(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error:', error)
      alert(error.message || 'حدث خطأ أثناء إضافة المستخدم')
    }
  }

  async function handleUpdateUser(userId: string, data: {
    full_name?: string;
    role?: string;
    center_id?: number | null;
  }) {
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(data)
        .eq('id', userId);
      
      if (error) throw error;
      alert('تم تحديث بيانات المستخدم بنجاح');
      fetchUsers();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'حدث خطأ أثناء تحديث البيانات');
    }
  }

  async function handleDeleteUser(userId: string) {
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      alert('تم حذف المستخدم بنجاح');
      fetchUsers();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'حدث خطأ أثناء حذف المستخدم');
    }
  }

  async function handleResetPassword(userId: string) {
    try {
      const newPassword = Math.random().toString(36).slice(-8);
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      
      if (error) throw error;
      setModalData({ newPassword });
      setModalType('password');
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  }

  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-red-100 rounded-full p-3">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-bold text-center mb-2">تأكيد الحذف</h3>
        <p className="text-gray-500 text-center mb-6">
          هل أنت متأكد من حذف المستخدم {modalData.userName}؟
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setModalType('none')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              if (modalData.userId) handleDeleteUser(modalData.userId);
              setModalType('none');
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            حذف
          </button>
        </div>
      </div>
    </div>
  );

  const PasswordModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-green-100 rounded-full p-3">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-bold text-center mb-4">كلمة المرور الجديدة</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-center font-mono text-lg select-all">
            {modalData.newPassword}
          </p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => {
              navigator.clipboard.writeText(modalData.newPassword || '');
              setModalType('none');
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            نسخ وإغلاق
          </button>
        </div>
      </div>
    </div>
  );

  const EditUserModal = () => {
    const [formData, setFormData] = useState({
      full_name: modalData.user?.full_name || '',
      role: modalData.user?.role || '',
      center_id: modalData.user?.center_id || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!modalData.user?.id) return;

      try {
        await handleUpdateUser(modalData.user.id, {
          ...formData,
          center_id: formData.role === 'manager' ? (formData.center_id ? Number(formData.center_id) : null) : null
        });
        setModalType('none');
      } catch (error) {
        console.error('Error:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-bold mb-4">تعديل بيانات المستخدم</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                الاسم الكامل
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                الدور
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value, center_id: '' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              >
                <option value="admin">مدير</option>
                <option value="manager">مشرف</option>
                <option value="staff">موظف</option>
              </select>
            </div>

            {formData.role === 'manager' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  المركز
                </label>
                <select
                  value={formData.center_id}
                  onChange={(e) => setFormData({ ...formData, center_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  required
                >
                  <option value="">اختر المركز</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setModalType('none')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const AddUserModal = () => {
    const [role, setRole] = useState('staff');
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        await handleSubmit(e);
        setSelectedUser(null);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">إضافة مستخدم جديد</h3>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                الاسم الكامل
              </label>
              <input
                name="full_name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                placeholder="أدخل الاسم الكامل"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <input
                name="email"
                type="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                placeholder="example@domain.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                الدور
              </label>
              <select
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="staff">موظف</option>
                <option value="manager">مشرف مركز</option>
                <option value="admin">مدير نظام</option>
              </select>
            </div>

            {role === 'manager' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  المركز
                </label>
                <select
                  name="center_id"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">اختر المركز</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse mt-6">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (auth.loading || loading) {
    return <div>جاري التحميل...</div>
  }

  if (auth.userRole !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">عذراً، ليس لديك صلاحية لعرض هذه الصفحة</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* رأس الصفحة */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">إدارة المستخدمين والصلاحيات في النظام</p>
            </div>
            <button
              onClick={() => setSelectedUser({ id: '', full_name: '', email: '', role: 'staff', created_at: '' })}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              إضافة مستخدم جديد
            </button>
          </div>
        </div>

        {/* إضافة قسم الإحصائيات السريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-5">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">إجمالي المستخدمين</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{users.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="mr-5">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">مدراء النظام</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === 'admin').length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="mr-5">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">مشرفي المراكز</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === 'manager').length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="mr-5">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">الموظفين</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === 'staff').length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* تحسين قسم البحث والفلترة */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">البحث والتصفية</h2>
              {(searchTerm || filterRole || filterCenter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterRole('');
                    setFilterCenter('');
                  }}
                  className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  مسح الفلاتر
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بحث</label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    placeholder="بحث بالاسم أو البريد"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pr-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدور</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                >
                  <option value="">جميع الأدوار</option>
                  <option value="admin">مدير نظام</option>
                  <option value="manager">مدير مركز</option>
                  <option value="staff">موظف</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المركز</label>
                <select
                  value={filterCenter}
                  onChange={(e) => setFilterCenter(e.target.value)}
                  className="block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                >
                  <option value="">جميع المراكز</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {(searchTerm || filterRole || filterCenter) && (
              <div className="mt-4 text-sm text-gray-500">
                تم العثور على {filteredUsers.length} نتيجة
              </div>
            )}
          </div>
        </div>

        {/* جدول المستخدمين */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الاسم
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    البريد الإلكتروني
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الدور
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    المركز
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                        ${user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300' 
                          : user.role === 'manager' 
                            ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' 
                            : 'bg-green-100 text-green-800 ring-1 ring-green-300'}`}>
                        <span className={`w-2 h-2 mr-2 rounded-full
                          ${user.role === 'admin' 
                            ? 'bg-purple-400' 
                            : user.role === 'manager' 
                              ? 'bg-blue-400' 
                              : 'bg-green-400'}`}>
                        </span>
                        {user.role === 'admin' ? 'مدير نظام' : 
                         user.role === 'manager' ? 'مدير مركز' : 
                         'موظف'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {centers.find(c => c.id === user.center_id)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(user.created_at).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <button
                          onClick={() => {
                            setModalData({ user });
                            setModalType('edit');
                          }}
                          className="inline-flex items-center text-blue-600 hover:text-blue-900 transition-colors duration-200"
                        >
                          <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          تعديل
                        </button>
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="inline-flex items-center text-green-600 hover:text-green-900 transition-colors duration-200"
                        >
                          <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          كلمة المرور
                        </button>
                        <button
                          onClick={() => {
                            setModalData({ userId: user.id, userName: user.full_name });
                            setModalType('delete');
                          }}
                          className="inline-flex items-center text-red-600 hover:text-red-900 transition-colors duration-200"
                        >
                          <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* حالة التحميل */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>جاري التحميل...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* النوافذ المنبثقة */}
      {modalType === 'delete' && <DeleteConfirmModal />}
      {modalType === 'password' && <PasswordModal />}
      {modalType === 'edit' && <EditUserModal />}
      {selectedUser && <AddUserModal />}
    </div>
  )
}

export async function handleUserApproval(userId: string, approve: boolean) {
  try {
    if (approve) {
      // تحديث role المستخدم
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'staff' })
        .eq('id', userId);

      if (error) throw error;
      
      alert('تم قبول المستخدم بنجاح!');
    } else {
      // حذف المستخدم
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      
      alert('تم رفض المستخدم');
    }

    await fetchUsers();
  } catch (error: any) {
    console.error('Error:', error);
    alert(`حدث خطأ: ${error.message}`);
  }
}
function fetchUsers() {
  throw new Error('Function not implemented.')
}

