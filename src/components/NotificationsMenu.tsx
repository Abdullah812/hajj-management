import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { BellIcon } from '@heroicons/react/24/outline'

interface NotificationsMenuProps {
  className?: string;
}

export function NotificationsMenu({ className }: NotificationsMenuProps) {
  return (
    <div className={className}>
      <Menu as="div" className="relative">
        <Menu.Button className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <span className="sr-only">الإشعارات</span>
          <div className="relative">
            <BellIcon className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 flex items-center justify-center text-xs text-white">
              3
            </span>
          </div>
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
          <Menu.Items className="absolute left-0 mt-2 w-80 origin-top-left rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">الإشعارات</h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={`${
                      active ? 'bg-gray-50 dark:bg-gray-700' : ''
                    } block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <BellIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <div className="mr-3 w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          وصول حاج جديد
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          تم تسجيل وصول الحاج أحمد محمد إلى المركز
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          قبل 5 دقائق
                        </p>
                      </div>
                    </div>
                  </a>
                )}
              </Menu.Item>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2">
              <a
                href="#"
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                عرض كل الإشعارات
              </a>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  )
} 