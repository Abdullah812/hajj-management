import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function PushNotificationSubscriber() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  async function registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        setRegistration(registration);
        
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('Error registering service worker:', error);
    }
  }

  async function subscribeToNotifications() {
    try {
      if (!registration) return;

      // طلب إذن الإشعارات
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      // الاشتراك في خدمة Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // حفظ الاشتراك في Supabase
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('push_subscriptions')
        .insert({
          subscription: JSON.stringify(subscription),
          user_id: user?.id,
          created_at: new Date().toISOString()
        });

      setIsSubscribed(true);
      alert('تم تفعيل الإشعارات بنجاح!');
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      alert('حدث خطأ أثناء تفعيل الإشعارات');
    }
  }

  async function unsubscribeFromNotifications() {
    try {
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // حذف الاشتراك من Supabase
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user?.id);

        setIsSubscribed(false);
        alert('تم إلغاء الاشتراك في الإشعارات');
      }
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      alert('حدث خطأ أثناء إلغاء الاشتراك');
    }
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return (
      <div className="text-gray-500">
        متصفحك لا يدعم الإشعارات
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
        className={`
          px-4 py-2 rounded-md transition-colors
          ${isSubscribed 
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
          }
        `}
      >
        {isSubscribed ? 'إلغاء تفعيل الإشعارات' : 'تفعيل إشعارات المتصفح'}
      </button>
    </div>
  );
} 