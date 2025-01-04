import { supabase } from "../lib/supabase";

export async function handleRegister(email: string, password: string, fullName: string) {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) throw error;

    alert('تم التسجيل بنجاح! يرجى انتظار موافقة الإدارة.');
    
  } catch (error: any) {
    console.error('Error:', error);
    alert(`حدث خطأ أثناء التسجيل: ${error.message}`);
  }
} 