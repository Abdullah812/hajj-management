import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.1'

// إعداد مفاتيح VAPID
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
)

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { alert } = await req.json()

    // جلب جميع الاشتراكات النشطة
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subscriptionError) throw subscriptionError

    // إرسال الإشعار لكل مشترك
    const notifications = subscriptions.map(async (sub) => {
      try {
        const subscription = JSON.parse(sub.subscription)
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: `تنبيه ${alert.type}`,
            body: alert.message,
            icon: '/icon.png',
            badge: '/badge.png',
            data: {
              url: `/stages/${alert.stage_id}`,
              alertId: alert.id
            }
          })
        )
      } catch (error) {
        console.error(`Error sending notification to subscription ${sub.id}:`, error)
        
        // إذا كان الاشتراك غير صالح، قم بحذفه
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
      }
    })

    await Promise.all(notifications)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 