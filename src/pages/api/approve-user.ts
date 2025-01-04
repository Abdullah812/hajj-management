import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

app.post('/api/approve-user', async (req, res) => {
  try {
    const { userId } = req.body

    // 1. جلب بيانات المستخدم المؤقت
    const { data: tempUser, error: fetchError } = await supabase
      .from('temp_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !tempUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // 2. إنشاء مستخدم جديد في auth
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: tempUser.email,
      email_confirm: true,
      password: 'DefaultPass123!',
      user_metadata: { full_name: tempUser.full_name }
    })

    if (createError || !data.user) {
      return res.status(500).json({ 
        error: createError?.message || 'Failed to create user'
      })
    }

    // 3. إضافة المستخدم في profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        email: tempUser.email,
        full_name: tempUser.full_name,
        role: tempUser.role,
        center_id: tempUser.center_id
      }])

    if (profileError) {
      return res.status(500).json({ error: profileError.message })
    }

    // 4. تحديث حالة المستخدم المؤقت
    const { error: updateError } = await supabase
      .from('temp_users')
      .update({ status: 'approved' })
      .eq('id', userId)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 