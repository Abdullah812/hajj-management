import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link, NavLink } from 'react-router-dom'
import { 
  ChartBarIcon, 
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  UsersIcon,
  ChevronDownIcon,
  BuildingOfficeIcon,
  ClockIcon,      
  TruckIcon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { NotificationsMenu } from './NotificationsMenu'
import { useAuthorization } from '../hooks/useAuthorization'
import { Toast } from './Toast'
import { ConfirmDialog } from './ConfirmDialog'
import { ThemeToggle } from './ThemeToggle'
import { supabase } from '../lib/supabase'
import clsx from 'clsx'


function navLinkClasses({ isActive }: { isActive: boolean }) {
  return `text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 
    px-3 py-2 text-sm font-medium border-b-2 transition-all duration-200 
    hover:scale-105 transform-gpu flex items-center
    ${
      isActive 
        ? 'border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400' 
        : 'border-transparent hover:border-primary-300 dark:hover:border-primary-700'
    }`
}

function menuItemClasses(active: boolean) {
  return `${
    active ? 'bg-gray-100 dark:bg-gray-700' : ''
  } flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 w-full text-right
    transition-all duration-200 hover:pl-6 hover:pr-2
    transform-gpu hover:scale-[1.02]`
}


export function Navbar() {
  const { user, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const { isAdmin, userRole } = useAuthorization()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success')
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false)
  const [profile, setProfile] = useState<{ center_id?: number | null }>({})
  const [, setBadgeCount] = useState(0)

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('center_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data)
        })
    }
  }, [user])

  useEffect(() => {
    async function fetchBadgeCount() {
      const { count } = await supabase
        .from('stage_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_resolved', false)
      setBadgeCount(count || 0)
    }
    fetchBadgeCount()
  }, [])

  async function handleSignOut() {
    setShowConfirmSignOut(false)
    try {
      setIsLoading(true)
      await signOut()
      window.location.href = '/login'
    } catch (error) {
      setToastMessage('حدث خطأ أثناء تسجيل الخروج')
      setToastType('error')
      setShowToast(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center gap-2 sm:gap-3">
              <img
                src="/images/logo.png"
                alt="شعار الشركة"
                className="h-8 w-auto sm:h-10"
              />
              <span className="text-sm sm:text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent hidden sm:block">
                نظام إدارة النقل الترددي
              </span>
            </Link>
          </div>

          <div className="hidden sm:flex sm:items-center sm:space-x-4 sm:space-x-reverse">
            <div className="flex items-center space-x-6 space-x-reverse">
              <NavLink to="/" className={navLinkClasses}>
                <ChartBarIcon className="h-5 w-5 ml-1" />
                لوحة عرض المعلومات
              </NavLink>

              {userRole === 'admin' && (
                <NavLink to="/pilgrims" className={navLinkClasses}>
                  <UsersIcon className="h-5 w-5 ml-1" />
                  الحجاج
                </NavLink>
              )}

              <NavLink to="/stages-list" className={navLinkClasses}>
                <ClockIcon className="h-5 w-5 ml-1" />
                المراحل المتاحة
              </NavLink>

              {(userRole === 'manager' || userRole === 'staff') && profile.center_id && (
                <>
                  <NavLink to={`/center-dashboard/${profile.center_id}`} className={navLinkClasses}>
                    <BuildingOfficeIcon className="h-5 w-5 ml-1" />
                    لوحة تحكم المركز
                  </NavLink>
                  <NavLink to={`/center-details/${profile.center_id}`} className={navLinkClasses}>
                    <BuildingOfficeIcon className="h-5 w-5 ml-1" />
                    تفاصيل المركز
                  </NavLink>
                </>
              )}

              <NavLink to="/buses" className={navLinkClasses}>
                <TruckIcon className="h-5 w-5 ml-1" />
                الباصات
              </NavLink>
            </div>

            <Menu as="div" className="relative">
              <Menu.Button className="text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 text-sm font-medium border-b-2 border-transparent inline-flex items-center">
                <Cog6ToothIcon className="h-5 w-5 ml-1" />
                الإدارة
                <ChevronDownIcon className="h-4 w-4 mr-1" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none transform perspective-1200 hover:perspective-none transition-all duration-200">
                  <div className="py-1">
                    {isAdmin && (
                      <>
                        <Menu.Item>
                          {({ active }) => (
                            <Link to="/centers" className={menuItemClasses(active)}>
                              <BuildingOfficeIcon className="h-5 w-5 ml-2" />
                              إدارة المراكز
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link to="/users" className={menuItemClasses(active)}>
                              <UsersIcon className="h-5 w-5 ml-2" />
                              إدارة المستخدمين
                            </Link>
                          )}
                        </Menu.Item>
                      </>
                    )}
                  </div>

                  <div className="py-1">
                    {userRole === 'admin' && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link to="/stages" className={menuItemClasses(active)}>
                            <ClockIcon className="h-5 w-5 ml-2" />
                            إدارة المراحل
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    <Menu.Item>
                      {({ active }) => (
                        <Link to="/reports" className={menuItemClasses(active)}>
                          <ChartBarIcon className="h-5 w-5 ml-2" />
                          التقارير
                        </Link>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle className="w-8 h-8 sm:w-10 sm:h-10" />
            {user && (
              <NotificationsMenu className="w-8 h-8 sm:w-10 sm:h-10" />
            )}
            
            {user && (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-1 sm:gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1 sm:p-2">
                  <UserCircleIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                  <span className="text-xs sm:text-sm font-medium hidden md:block">
                    {user.email}
                  </span>
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute left-0 mt-2 w-48 rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 w-full text-right`}
                        >
                          <UserCircleIcon className="h-5 w-5" />
                          الملف الشخصي
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/settings"
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 w-full text-right`}
                        >
                          <Cog6ToothIcon className="h-5 w-5" />
                          الإعدادات
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setShowConfirmSignOut(true)}
                          disabled={isLoading}
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 
                            w-full text-right disabled:opacity-50
                            transition-all duration-200
                            hover:bg-red-50 dark:hover:bg-red-900/20`}
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                          {isLoading ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}
            {!user && (
              <Link 
                to="/login" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium 
                  rounded-md text-white bg-primary-600 hover:bg-primary-700 
                  transition-all duration-200 shadow-sm hover:shadow 
                  transform-gpu hover:scale-105 hover:-translate-y-0.5
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                تسجيل الدخول
              </Link>
            )}

            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        <Transition
          show={isMobileMenuOpen}
          enter="transition-all ease-out duration-300"
          enterFrom="opacity-0 -translate-y-2"
          enterTo="opacity-100 translate-y-0"
          leave="transition-all ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 -translate-y-2"
          className="sm:hidden"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 border-t dark:border-gray-700">
            <div className="grid gap-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ChartBarIcon className="h-5 w-5" />
                <span>لوحة عرض المعلومات</span>
              </NavLink>
              
              {isAdmin && (
                <>
                  <NavLink
                    to="/centers"
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <BuildingOfficeIcon className="h-5 w-5" />
                    <span>إدارة المراكز</span>
                  </NavLink>
                  <NavLink
                    to="/users"
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UsersIcon className="h-5 w-5" />
                    <span>إدارة المستخدمين</span>
                  </NavLink>
                </>
              )}
              
              {userRole === 'admin' && (
                <NavLink
                  to="/pilgrims"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <UsersIcon className="h-5 w-5" />
                  <span>الحجاج</span>
                </NavLink>
              )}
              
              {(userRole === 'manager' || userRole === 'staff') && profile.center_id && (
                <>
                  <NavLink
                    to={`/center-dashboard/${profile.center_id}`}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <BuildingOfficeIcon className="h-5 w-5" />
                    <span>لوحة تحكم المركز</span>
                  </NavLink>
                  <NavLink
                    to={`/center-details/${profile.center_id}`}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <BuildingOfficeIcon className="h-5 w-5" />
                    <span>تفاصيل المركز</span>
                  </NavLink>
                </>
              )}
              <NavLink
                to="/stages"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ClockIcon className="h-5 w-5" />
                <span>المراحل</span>
              </NavLink>
              <NavLink
                to="/stages-list"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ClockIcon className="h-5 w-5" />
                <span>المراحل المتاحة</span>
              </NavLink>
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ChartBarIcon className="h-5 w-5" />
                <span>التقارير</span>
              </NavLink>
              <NavLink
                to="/buses"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <TruckIcon className="h-5 w-5" />
                <span>الباصات</span>
              </NavLink>
            </div>
          </div>
        </Transition>
      </div>
      <Toast
        show={showToast}
        type={toastType}
        message={toastMessage}
        onClose={() => setShowToast(false)}
      />
      <ConfirmDialog
        isOpen={showConfirmSignOut}
        title="تأكيد تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج؟"
        confirmText="تسجيل الخروج"
        cancelText="إلغاء"
        onConfirm={handleSignOut}
        onCancel={() => setShowConfirmSignOut(false)}
        type="warning"
      />
    </nav>
  )
} 