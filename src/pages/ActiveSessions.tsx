import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Session = {
  id: string;
  device_info: string;
  last_activity: string;
  ip_address: string;
  login_time: string;
  email: string;
};

export function ActiveSessions() {
  const { getActiveSessions, user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getActiveSessions();
      setSessions(data);
      setError('');
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('حدث خطأ في تحميل الجلسات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEndSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('active_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      // إظهار رسالة نجاح (يمكنك إضافة مكتبة toast)
    } catch (error) {
      console.error('Error ending session:', error);
      setError('فشل في إنهاء الجلسة');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
        <button 
          onClick={loadSessions}
          className="ml-4 text-sm underline hover:text-red-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">الجلسات النشطة</h2>
        <button 
          onClick={loadSessions}
          className="text-primary-600 hover:text-primary-700"
        >
          تحديث
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          لا توجد جلسات نشطة حالياً
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map(session => (
            <div key={session.id} className="border p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="font-semibold">البريد: {session.email}</p>
                  <p>الجهاز: {session.device_info}</p>
                  <p>آخر نشاط: {new Date(session.last_activity).toLocaleString('ar')}</p>
                  <p>وقت الدخول: {new Date(session.login_time).toLocaleString('ar')}</p>
                  <p>عنوان IP: {session.ip_address}</p>
                </div>
                {user?.email !== session.email && (
                  <button
                    onClick={() => handleEndSession(session.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    إنهاء الجلسة
                  </button>
                )}
              </div>
              {user?.email === session.email && (
                <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                  ✓ هذه جلستك الحالية
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 