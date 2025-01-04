import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email, full_name, role, center_id } = req.body

  try {
    // إنشاء المستخدم
    const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: 'DefaultPass123!',
      email_confirm: true
    })

    if (userError) throw userError
    if (!user) throw new Error('Failed to create user')

    // إضافة البيانات في profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: user.id,
        full_name,
        email,
        role,
        center_id
      }])

    if (profileError) throw profileError

    res.status(200).json({ success: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
} 