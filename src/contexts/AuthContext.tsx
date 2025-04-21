import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Session, User } from '@supabase/supabase-js'

type UserData = {
  id: string
  full_name: string | null
  phone: string | null
  role: 'admin' | 'manager' | 'employee'
  center_id: string | null
}

type AuthContextType = {
  user: User | null
  userData: UserData | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  getActiveSessions: () => Promise<any[]>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line

  async function fetchUserData(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        throw error;
      }

      if (!data) {
        console.error('No user data found');
        return;
      }

      console.log('Fetched user data:', data); // للتأكد من البيانات
      setUserData(data);
      
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      // في حالة الخطأ، نحاول مرة أخرى بعد ثانية
      setTimeout(() => fetchUserData(userId), 1000);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          // التحقق من وجود جلسة صالحة
          const { data: activeSession } = await supabase
            .from('active_sessions')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (!activeSession) {
            // إذا لم توجد جلسة نشطة، نقوم بتسجيل الخروج
            await signOut();
            throw new Error('لم يتم العثور على جلسة نشطة');
          }

          setSession(session);
          setUser(session.user);
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // 2. مراقبة تغييرات الجلسة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    try {
      // 1. تسجيل الدخول
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // 2. حذف أي جلسات قديمة
      await supabase
        .from('active_sessions')
        .delete()
        .eq('user_id', authData.user.id);

      // 3. إنشاء جلسة جديدة
      const { error: sessionError } = await supabase
        .from('active_sessions')
        .insert({
          user_id: authData.user.id,
          email: email,
          device_info: navigator.userAgent,
          ip_address: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => data.ip),
          last_activity: new Date().toISOString(),
          login_time: new Date().toISOString()
        });

      if (sessionError) throw sessionError;

      // 4. تحديث الحالة
      setUser(authData.user);
      setSession(authData.session);

      return authData;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // دالة تحديث آخر نشاط
  async function updateLastActivity() {
    if (!user) return;
    
    await supabase
      .from('active_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('user_id', user.id);
  }

  // دالة تسجيل الخروج
  async function signOut() {
    try {
      if (user) {
        // حذف الجلسة
        await supabase
          .from('active_sessions')
          .delete()
          .eq('user_id', user.id);
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // إضافة دالة للحصول على معلومات الجلسات النشطة
  async function getActiveSessions() {
    if (!user) return [];
    
    const { data } = await supabase
      .from('active_sessions')
      .select('*')
      .order('last_activity', { ascending: false });
      
    return data || [];
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      session, 
      loading, 
      signIn: async (email: string, password: string) => {
        const result = await signIn(email, password);
        return;
      }, 
      signOut: signOut,
      getActiveSessions
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const useUser = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return context;
}; 