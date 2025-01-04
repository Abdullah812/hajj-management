import { Fragment } from 'react'
import { Transition } from '@headlessui/react'
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ToastProps {
  show: boolean
  type: 'success' | 'error' | 'warning'
  message: string
  onClose: () => void
}

export function Toast({ show, type, message, onClose }: ToastProps) {
  const icons = {
    success: <CheckCircleIcon className="h-6 w-6 text-green-400 dark:text-green-300" />,
    error: <XCircleIcon className="h-6 w-6 text-red-400 dark:text-red-300" />,
    warning: <ExclamationCircleIcon className="h-6 w-6 text-yellow-400 dark:text-yellow-300" />
  }

  const backgrounds = {
    success: 'bg-green-50 dark:bg-green-900/50',
    error: 'bg-red-50 dark:bg-red-900/50',
    warning: 'bg-yellow-50 dark:bg-yellow-900/50'
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4">
      <Transition
        show={show}
        as={Fragment}
        enter="transform ease-out duration-300 transition"
        enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enterTo="translate-y-0 opacity-100 sm:translate-x-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ${backgrounds[type]} ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10`}>
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {icons[type]}
              </div>
              <div className="mr-3 w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {message}
                </p>
              </div>
              <div className="mr-4 flex-shrink-0 flex">
                <button
                  className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                  onClick={onClose}
                >
                  <span className="sr-only">إغلاق</span>
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  )
} 