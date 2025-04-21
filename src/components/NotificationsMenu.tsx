import { Fragment, useEffect, useState } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { BellIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { Alert } from '../types/alerts'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale/ar'

interface NotificationsMenuProps {
  className?: string;
}

export function NotificationsMenu({ className }: NotificationsMenuProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  useEffect(() => {
    fetchAlerts();
    
    const subscription = supabase
      .channel('stage_alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stage_alerts' },
        (payload) => {
          setAlerts(prev => [payload.new as Alert, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchAlerts() {
    const { data } = await supabase
      .from('stage_alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(5);
    
    setAlerts(data || []);
  }

  return (
    <div className={className}>
      <Menu as="div" className="relative">
        <Menu.Button className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <span className="sr-only">الإشعارات</span>
          <div className="relative">
            <BellIcon className="h-6 w-6" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 flex items-center justify-center text-xs text-white">
                {alerts.length}
              </span>
            )}
          </div>
        </Menu.Button>

        <Transition as={Fragment} {...transitionProps}>
          <Menu.Items className="absolute left-0 mt-2 w-96 origin-top-left rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">الإشعارات</h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  لا توجد تنبيهات حالياً
                </div>
              ) : (
                alerts.map(alert => (
                  <Menu.Item key={alert.id}>
                    {({ active }) => (
                      <a
                        href={`/stages/${alert.stage_id}`}
                        className={`${
                          active ? 'bg-gray-50 dark:bg-gray-700' : ''
                        } block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200`}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              alert.type === 'critical' ? 'bg-red-100 dark:bg-red-900' :
                              alert.type === 'high' ? 'bg-orange-100 dark:bg-orange-900' :
                              'bg-blue-100 dark:bg-blue-900'
                            }`}>
                              <BellIcon className={`h-5 w-5 ${
                                alert.type === 'critical' ? 'text-red-600 dark:text-red-400' :
                                alert.type === 'high' ? 'text-orange-600 dark:text-orange-400' :
                                'text-blue-600 dark:text-blue-400'
                              }`} />
                            </div>
                          </div>
                          <div className="mr-3 w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {alert.message}
                            </p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              {formatDistanceToNow(new Date(alert.created_at), { locale: ar, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </a>
                    )}
                  </Menu.Item>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2">
              <a
                href="/alerts"
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                عرض كل التنبيهات
              </a>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}

const transitionProps = {
  enter: "transition ease-out duration-100",
  enterFrom: "transform opacity-0 scale-95",
  enterTo: "transform opacity-100 scale-100",
  leave: "transition ease-in duration-75",
  leaveFrom: "transform opacity-100 scale-100",
  leaveTo: "transform opacity-0 scale-95"
}; 