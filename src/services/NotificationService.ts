import { Alert } from '../types/alerts'
import { supabase } from '../lib/supabase'

export class NotificationService {
  static async sendPushNotification(alert: Alert) {
    try {
      // إرسال إشعار Push عبر Supabase
      await supabase
        .from('notifications')
        .insert({
          type: 'push',
          alert_id: alert.id,
          title: `تنبيه ${alert.type}`,
          message: alert.message,
          recipient_id: alert.stage_id, // يمكن تحديد المستلمين حسب المرحلة
          status: 'pending',
          metadata: {
            priority: alert.type,
            stage_id: alert.stage_id,
            ...alert.metadata
          }
        })

      // تفعيل وظيفة Edge Function في Supabase لإرسال الإشعار
      await supabase.functions.invoke('send-push-notification', {
        body: { alert }
      })
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }

  static async sendSMS(alert: Alert) {
    try {
      // إرسال SMS عبر Supabase Edge Function
      await supabase
        .from('notifications')
        .insert({
          type: 'sms',
          alert_id: alert.id,
          message: alert.message,
          recipient_id: alert.stage_id,
          status: 'pending'
        })

      await supabase.functions.invoke('send-sms', {
        body: { alert }
      })
    } catch (error) {
      console.error('Error sending SMS:', error)
    }
  }

  static async sendWhatsApp(alert: Alert) {
    try {
      // إرسال WhatsApp عبر Supabase Edge Function
      await supabase
        .from('notifications')
        .insert({
          type: 'whatsapp',
          alert_id: alert.id,
          message: alert.message,
          recipient_id: alert.stage_id,
          status: 'pending'
        })

      await supabase.functions.invoke('send-whatsapp', {
        body: { alert }
      })
    } catch (error) {
      console.error('Error sending WhatsApp message:', error)
    }
  }

  static async sendEmail(alert: Alert) {
    try {
      // إرسال بريد إلكتروني عبر Supabase
      await supabase
        .from('notifications')
        .insert({
          type: 'email',
          alert_id: alert.id,
          subject: `تنبيه ${alert.type} - المرحلة`,
          message: alert.message,
          recipient_id: alert.stage_id,
          status: 'pending'
        })

      await supabase.functions.invoke('send-email', {
        body: { alert }
      })
    } catch (error) {
      console.error('Error sending email:', error)
    }
  }

  // وظيفة مساعدة لتتبع حالة الإشعارات
  static async trackNotificationStatus(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (error) {
      console.error('Error tracking notification:', error)
      return null
    }

    return data
  }
} 