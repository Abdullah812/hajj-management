import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tempUserId } = await req.json()
    
    // إنشاء Supabase client مع service_role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // جلب بيانات المستخدم المؤقت
    const { data: tempUser, error: fetchError } = await supabase
      .from('temp_users')
      .select('*')
      .eq('id', tempUserId)
      .single()

    if (fetchError) throw fetchError

    // إنشاء المستخدم في Auth
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: tempUser.email,
      password: 'DefaultPass123!',
      email_confirm: true,
      user_metadata: { full_name: tempUser.full_name }
    })

    if (createError) throw createError

    // إضافة المستخدم في Profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: tempUser.email,
        full_name: tempUser.full_name,
        role: tempUser.role === 'manager' ? 'manager' : 'staff',
        center_id: tempUser.center_id
      })

    if (profileError) throw profileError

    // تحديث حالة المستخدم المؤقت
    const { error: updateError } = await supabase
      .from('temp_users')
      .update({ status: 'approved' })
      .eq('id', tempUserId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, userId: authUser.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
}) 