import React from 'react';
import { Alert, AlertPriority } from '../types/alerts';
import { BellIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AlertDisplayProps {
  alert: Alert;
  onResolve: (alertId: number) => void;
}

const alertStyles: Record<AlertPriority, {
  containerClass: string;
  iconClass: string;
  Icon: typeof BellIcon;
  animation?: string;
}> = {
  critical: {
    containerClass: 'bg-red-50 border-red-500 text-red-800',
    iconClass: 'text-red-600',
    Icon: ExclamationCircleIcon,
    animation: 'animate-pulse'
  },
  high: {
    containerClass: 'bg-orange-50 border-orange-500 text-orange-800',
    iconClass: 'text-orange-600',
    Icon: ExclamationCircleIcon
  },
  medium: {
    containerClass: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    iconClass: 'text-yellow-600',
    Icon: BellIcon
  },
  low: {
    containerClass: 'bg-blue-50 border-blue-500 text-blue-800',
    iconClass: 'text-blue-600',
    Icon: BellIcon
  }
};

function formatTimeRemaining(timeRemaining: number): string {
  if (timeRemaining <= 0) {
    return 'تجاوزت وقت النهاية';
  } else if (timeRemaining <= 1) {
    return 'متبقي أقل من ساعة';
  } else {
    return `متبقي ${Math.round(timeRemaining)} ساعة`;
  }
}

export function AlertDisplay({ alert, onResolve }: AlertDisplayProps) {
  const style = alertStyles[alert.type] || alertStyles.low; // استخدام low كقيمة افتراضية
  const { Icon } = style;

  return (
    <div 
      className={`rounded-lg border-r-4 p-4 mb-4 ${style.containerClass} ${style.animation || ''}`}
      role="alert"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${style.iconClass}`} />
          </div>
          <div className="mr-3">
            <div className="flex items-center">
              <h3 className="text-sm font-medium">
                {alert.type === 'critical' && 'تنبيه حرج'}
                {alert.type === 'high' && 'تنبيه عالي'}
                {alert.type === 'medium' && 'تنبيه'}
                {alert.type === 'low' && 'تحديث'}
              </h3>
              {alert.metadata?.timeRemaining !== undefined && (
                <span className="mr-2 text-sm opacity-75">
                  ({formatTimeRemaining(alert.metadata.timeRemaining)})
                </span>
              )}
            </div>
            <p className="mt-1 text-sm">{alert.message}</p>
            {alert.metadata?.occupancyRate && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      alert.type === 'critical' ? 'bg-red-600' :
                      alert.type === 'high' ? 'bg-orange-600' :
                      alert.type === 'medium' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, alert.metadata.occupancyRate)}%` }}
                  />
                </div>
                <span className="text-xs mt-1">
                  نسبة الإشغال: {Math.round(alert.metadata.occupancyRate)}%
                </span>
              </div>
            )}
            {alert.metadata?.departureRate !== undefined && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      alert.metadata.departureRate >= 90 ? 'bg-green-600' :
                      alert.metadata.departureRate >= 70 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(100, alert.metadata.departureRate)}%` }}
                  />
                </div>
                <span className="text-xs mt-1 block">
                  نسبة المغادرة: {Math.round(alert.metadata.departureRate)}%
                </span>
              </div>
            )}
            <div className="mt-2 text-xs opacity-75">
              {new Date(alert.created_at).toLocaleString('ar-SA')}
            </div>
          </div>
        </div>
        <button
          onClick={() => onResolve(alert.id)}
          className={`p-1 rounded-full hover:bg-opacity-10 hover:bg-black transition-colors`}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
} 


