import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { StatsCard } from '../components/StatsCard'
import { UserGroupIcon, BuildingOfficeIcon, ArrowPathIcon, XMarkIcon, PhotoIcon, ChevronUpIcon, ChevronDownIcon, ShieldCheckIcon, UserIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

interface Stats {
  totalPilgrims: number
  activePilgrims: number
  totalCenters: number
  departedPilgrims: number
  centers: {
    id: number
    name: string
    default_capacity: number
    current_count: number
    departed_pilgrims: number
  }[]
  departedByNationality: {
    nationality: string
    departed_count: number
  }[]
  departedByStage: {
    id: number
    stage_name: string
    departed_count: number
    total_pilgrims?: number
    remaining_time?: string
    status: string
    start_date?: string
    start_time?: string
    end_date?: string
    end_time?: string
    nationality?: string
    required_departures?: number
  }[]
  nationalityStats: {
    nationality: string
    count: number
  }[]
}

interface ChatMessage {
  id: number;
  message: string;
  message_type: 'text' | 'image';
  file_url?: string;
  timestamp: string;
  sender_id: string;  // UUID
  sender: string;     // سنحذفه لاحقاً
  profile?: {         // معلومات المرسل من جدول profiles
    id: string;
    full_name: string;
    role: string;
    center_id?: string | null;
  };
}

interface OnlineUser {
  id: string;
  full_name: string;
  presence_ref?: string;
  role?: string;
  center_name?: string;
  last_seen?: string;
  profile?: {
    avatar_url?: string;
    phone?: string;
    position?: string;
    department?: string;
  }
}

interface DepartureRecord {
  id: number;
  center_id: number;
  center_name: string;
  batch_number: number;
  departed_count: number;
  departure_date: string;
  notes: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'waiting_departure':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return 'نشط';
    case 'completed': return 'مكتمل';
    case 'waiting_departure': return 'في انتظار المغادرة';
    default: return 'غير معروف';
  }
}

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalPilgrims: 0,
    activePilgrims: 0,
    totalCenters: 0,
    departedPilgrims: 0,
    centers: [],
    departedByNationality: [],
    departedByStage: [],
    nationalityStats: []
  })
  const [loading, setLoading] = useState(true)
  const [, setRemainingTimes] = useState<{[key: number]: string}>({});
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [whoIsTyping, setWhoIsTyping] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  let typingTimeout: NodeJS.Timeout;
  const [isOnline] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [, setSenders] = useState<{ id: string; full_name: string; role: string; center_id: number }[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isOnlineUsersModalOpen, setIsOnlineUsersModalOpen] = useState(false);
  const [departureHistory, setDepartureHistory] = useState<DepartureRecord[]>([]);

  useEffect(() => {
    if (!user) return

    // إنشاء قناة تواجد فريدة لكل مستخدم
    const channel = supabase.channel(`presence:${user.id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    // عند الاتصال، نحذف أي تواجد سابق ونضيف التواجد الحالي فقط
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        if (Object.keys(state).length > 1) {
          // إذا كان هناك أكثر من تواجد، نحتفظ بالأحدث فقط
          channel.track({ user_id: user.id, last_seen: new Date().toISOString() })
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  useEffect(() => {
    fetchStats()
    fetchDepartureHistory()

    const interval = setInterval(() => {
      fetchStats()
      fetchDepartureHistory()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimes: {[key: number]: string} = {};
      
      stats.departedByStage.forEach(stage => {
        if (stage.status === 'active' && stage.end_date && stage.end_time) {
          const now = new Date();
          const endTime = new Date(`${stage.end_date}T${stage.end_time}`);
          const diffMs = endTime.getTime() - now.getTime();
          
          if (diffMs > 0) {
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            newTimes[stage.id] = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
        }
      });
      
      setRemainingTimes(newTimes);
    }, 1000);

    return () => clearInterval(timer);
  }, [stats.departedByStage]);

  useEffect(() => {
    fetchMessages();

    const intervalId = setInterval(() => {
      fetchMessages();
    }, 1000);

    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('Realtime update:', payload);
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const typingChannel = supabase
      .channel('typing')
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user !== 'المشرف') {
          setWhoIsTyping(payload.user);
          // Clear typing indicator after 2 seconds
          setTimeout(() => setWhoIsTyping(''), 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, []);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    if (
      isChatMinimized && 
      lastMessage && 
      lastMessage.sender !== user?.id && 
      new Date(lastMessage.timestamp).getTime() > new Date().getTime() - 1000
    ) {
      setUnreadCount(prev => prev + 1);
    }
  }, [messages, isChatMinimized]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, shouldScrollToBottom]);

  useEffect(() => {
    const fetchMessageSenders = async () => {
      // تجاهل الرسائل التي تحتوي على sender = 'admin'
      const validSenders = messages
        .map(msg => msg.sender)
        .filter(sender => sender.length > 20); // UUID عادة أطول من 20 حرفاً
      
      if (validSenders.length === 0) return;

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, center_id')
        .in('id', validSenders);
      
      setSenders(profiles || []);
    };
    
    if (messages.length > 0) {
      fetchMessageSenders();
    }
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, async () => {
        const state = channel.presenceState();
        console.log('Presence state:', state); // للتأكد من وصول البيانات
        
        // تحويل حالة التواجد إلى مصفوفة من المعرفات
        const userIds = Object.values(state)
          .flat()
          .map((presence: any) => presence.user_id);
        
        console.log('User IDs:', userIds); // للتأكد من المعرفات

        // جلب معلومات البروفايل مباشرة
        const { data: profiles } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            role,
            center_id,
            centers:center_id (
              id,
              name
            )
          `)
          .in('id', userIds);

        console.log('Profiles:', profiles); // للتأكد من البروفايلات

        // دمج معلومات التواجد مع البروفايل
        const online = Object.entries(state).map(([key, presences]) => {
          const presence = (presences as any[])[0];
          const userProfile = profiles?.find(p => p.id === presence.user_id);
          
          return {
            id: presence.user_id,
            full_name: userProfile?.full_name || 'مستخدم',
            presence_ref: key,
            role: userProfile?.role,
            center_name: userProfile?.centers?.[0]?.name,
            last_seen: presence.timestamp
          };
        });

        console.log('Online users:', online); // للتأكد من النتيجة النهائية
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // تسجيل تواجد المستخدم الحالي
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          await channel.track({
            user_id: user.id,
            full_name: userProfile?.full_name,
            role: userProfile?.role,
            timestamp: new Date().toISOString()
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  async function fetchStats() {
    try {
      const [groupsTotal, centersData, nationalityData, stagesData] = await Promise.all([
        supabase
          .from('pilgrim_groups')
          .select('count')
          .then(response => ({
            count: response.data?.reduce((sum, group) => sum + (group.count || 0), 0) || 0
          })),
        supabase
          .from('centers')
          .select(`
            id, 
            name,
            current_count,
            default_capacity,
            departed_pilgrims,
            stage_id
          `)
          .order('name'),
        supabase
          .from('pilgrim_groups')
          .select(`
            nationality,
            count,
            stages (
              departed_pilgrims
            )
          `)
          .not('stages', 'is', null),
        supabase
          .from('stages')
          .select(`
            id,
            name,
            status,
            departed_pilgrims,
            current_pilgrims,
            start_date,
            start_time,
            end_date,
            end_time,
            required_departures,
            pilgrim_groups!inner (
              id,
              nationality
            )
          `)
          .order('start_date', { ascending: true })
      ])

      if (centersData.data && nationalityData.data && stagesData.data) {
        const hasActiveStages = stagesData.data.length > 0;
        
        const totalInCenters = centersData.data.reduce((sum, center) => 
          sum + (center.current_count || 0), 0
        );

        const departedPilgrims = centersData.data.reduce((sum, center) => 
          sum + (center.departed_pilgrims || 0), 0
        );

        const centers = centersData.data.map(center => ({
          id: center.id,
          name: center.name,
          default_capacity: center.default_capacity || 0,
          current_count: center.current_count || 0,
          departed_pilgrims: hasActiveStages ? (center.departed_pilgrims || 0) : 0
        }))

        const formattedStages = stagesData.data.map(stage => {
          // طباعة البيانات الخام للتحقق
          console.log('Raw stage data:', JSON.stringify(stage, null, 2));
          
          // التحقق من وجود مجموعات الحجاج
          const pilgrimGroup = Array.isArray(stage.pilgrim_groups) 
            ? stage.pilgrim_groups[0] 
            : stage.pilgrim_groups;

          console.log('Pilgrim group:', pilgrimGroup);

          return {
            id: stage.id,
            stage_name: stage.name,
            departed_count: stage.departed_pilgrims || 0,
            total_pilgrims: stage.current_pilgrims,
            nationality: pilgrimGroup?.nationality || 'غير محدد',
            required_departures: stage.required_departures || 0,
            status: stage.status,
            start_date: stage.start_date,
            start_time: stage.start_time,
            end_date: stage.end_date,
            end_time: stage.end_time
          };
        });

        console.log('Final formatted stages:', formattedStages);
        
        const departedByNationality = nationalityData.data
          ?.map(group => ({
            nationality: group.nationality,
            departed_count: group.stages
              ? group.stages.reduce((sum, stage) => sum + (stage.departed_pilgrims || 0), 0)
              : 0
          }))
          .filter(item => item.departed_count > 0)
          .sort((a, b) => b.departed_count - a.departed_count) || [];

        setStats({
          totalPilgrims: groupsTotal.count,
          activePilgrims: totalInCenters,
          totalCenters: centersData.data.length,
          departedPilgrims,
          centers,
          departedByNationality,
          departedByStage: formattedStages,
          nationalityStats: nationalityData.data
            .map(group => ({
              nationality: group.nationality,
              count: group.count || 0
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profile:profiles(id, full_name, role, center_id)
        `)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const scrollToBottom = () => {
    if (shouldScrollToBottom && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrolledNearBottom = 
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    
    setShouldScrollToBottom(isScrolledNearBottom);
  };

  const handleTyping = async () => {
    if (!isTyping) {
      setIsTyping(true);
      await supabase.channel('typing').send({
        type: 'broadcast',
        event: 'typing',
        payload: { user: 'المشرف' }
      });
    }

    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);

    // Set new timeout
    typingTimeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  async function uploadImage(file: File) {
    try {
      setImageLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;

      // ضغط الصورة قبل الرفع
      if (file.size > 1024 * 1024) { // أكبر من 1MB
        const compressedFile = await compressImage(file);
        file = compressedFile;
      }

      const { error: uploadError, data } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: `image/${fileExt}`
        });

      if (uploadError) throw uploadError;
      if (!data) throw new Error('فشل رفع الصورة');

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء رفع الصورة');
      throw error;
    } finally {
      setImageLoading(false);
    }
  }

  // دالة ضغط الصور
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('فشل إنشاء سياق الرسم'));
            return;
          }

          // تحديد الأبعاد الجديدة
          let width = img.width;
          let height = img.height;
          if (width > 1200) {
            height = (height * 1200) / width;
            width = 1200;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('فشل ضغط الصورة'));
                return;
              }
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            },
            'image/jpeg',
            0.7 // جودة الضغط
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  async function handleSendMessage(message: string, type: 'text' | 'image' = 'text', fileUrl?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert([{
        message,
        sender: user?.id,
        sender_id: user?.id,
        message_type: type,
        file_url: fileUrl,
        timestamp: new Date().toISOString(),
        is_read: false
      }])
      .select(`
        *,
        profile:profiles(id, full_name, role, center_id)
      `)
      .single();

    if (error) throw error;
    return newMessage;
  }

  async function deleteMessage(messageId: number) {
    try {
      console.log('Trying to delete message:', messageId);
      console.log('Current user:', user);
      
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .select();  // إضافة select() للحصول على نتيجة العملية

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Message deleted successfully');
      setMessages(messages.filter(msg => msg.id !== messageId));
      toast.success('تم حذف الرسالة بنجاح');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('حدث خطأ أثناء حذف الرسالة');
    }
  }

  // دالة لتحميل الصورة مباشرة
  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `image-${Date.now()}.jpg`; // اسم الملف عند التحميل
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('حدث خطأ أثناء تحميل الصورة');
    }
  };

  const handleChatToggle = () => {
    setIsChatMinimized(!isChatMinimized);
    if (!isChatMinimized) {
      setUnreadCount(0);
    }
  };

  // تصنيف المستخدمين حسب الدور والمركز
  const groupedUsers = useMemo(() => {
    const grouped = {
      admins: [] as OnlineUser[],
      managers: [] as OnlineUser[],
      others: [] as OnlineUser[]
    };

    onlineUsers.forEach(user => {
      if (user.role === 'admin') {
        grouped.admins.push(user);
      } else if (user.role === 'manager') {
        grouped.managers.push(user);
      } else {
        grouped.others.push(user);
      }
    });

    // ترتيب كل مجموعة حسب آخر ظهور
    const sortByLastSeen = (a: OnlineUser, b: OnlineUser) => {
      return new Date(b.last_seen || '').getTime() - new Date(a.last_seen || '').getTime();
    };

    return {
      admins: grouped.admins.sort(sortByLastSeen),
      managers: grouped.managers.sort(sortByLastSeen),
      others: grouped.others.sort(sortByLastSeen)
    };
  }, [onlineUsers]);

  async function fetchDepartureHistory() {
    try {
      const { data, error } = await supabase
        .from('departure_history')
        .select(`
          *,
          centers:center_id (
            name
          )
        `)
        .order('departure_date', { ascending: false });

      if (error) throw error;

      // تنسيق البيانات لتشمل اسم المركز
      const formattedData = data?.map(record => ({
        ...record,
        center_name: record.centers?.name || 'غير معروف'
      })) || [];

      setDepartureHistory(formattedData);
    } catch (error) {
      console.error('Error fetching departure history:', error);
    }
  }

  const resetData = async () => {
    try {
      // Show confirmation dialog
      if (!window.confirm('هل أنت متأكد من تصفير جميع البيانات؟ لا يمكن التراجع عن هذه العملية.')) {
        return;
      }

      setLoading(true);

      // Reset stages
      const { error: stagesError } = await supabase
        .from('stages')
        .update({
          departed_pilgrims: 0,
          current_pilgrims: 0,
          status: 'waiting_departure'
        })
        .neq('id', 0);
      
      if (stagesError) throw stagesError;

      // Delete all departure history
      const { error: departureHistoryError } = await supabase
        .from('departure_history')
        .delete()
        .neq('id', 0);
      
      if (departureHistoryError) throw departureHistoryError;

      // Reset centers counters
      const { error: centersError } = await supabase
        .from('centers')
        .update({
          current_count: 0,
          departed_pilgrims: 0,
          current_batch: 1
        })
        .neq('id', 0);

      if (centersError) throw centersError;

      // Reset pilgrim_groups departed_count
      const { error: groupsError } = await supabase
        .from('pilgrim_groups')
        .update({
          departed_count: 0
        })
        .neq('id', 0);

      if (groupsError) throw groupsError;

      // Reset buses status
      const { error: busesError } = await supabase
        .from('buses')
        .update({
          status: 'available',
          current_trip_id: null
        })
        .neq('id', 0);

      if (busesError) throw busesError;

      // Refresh data
      await fetchStats();
      await fetchDepartureHistory();

      toast.success('تم تصفير جميع البيانات بنجاح');
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('حدث خطأ أثناء تصفير البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">لوحة عرض المعلومات</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={resetData}
              className="btn btn-danger flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {loading ? 'جاري التصفير...' : 'تصفير جميع البيانات'}
            </button>
            <span className="text-xs sm:text-sm text-gray-500">
              {loading ? 'جاري التحديث...' : 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-SA')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <StatsCard
            title="إجمالي الحجاج"
            value={stats.totalPilgrims}
            icon={<UserGroupIcon className="h-6 w-6 text-primary-600" />}
            loading={loading}
          />
          <StatsCard
            title="المراكز"
            value={stats.totalCenters}
            icon={<BuildingOfficeIcon className="h-6 w-6 text-blue-600" />}
            loading={loading}
          />
          <StatsCard
            title="المغادرين"
            value={stats.departedPilgrims}
            icon={<UserGroupIcon className="h-6 w-6 text-purple-600" />}
            loading={loading}
          />
          <StatsCard
            title="المتبقين"
            value={stats.activePilgrims}
            icon={<UserGroupIcon className="h-6 w-6 text-yellow-600" />}
            loading={loading}
          />
        </div>

        <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">إحصائيات الجنسيات</h2>
                
                {/* Mobile View */}
                <div className="block sm:hidden space-y-2">
                  {stats.nationalityStats.map((stat) => (
                    <div key={stat.nationality} className="bg-white rounded-lg shadow p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{stat.nationality}</span>
                        <span className="text-gray-900">{stat.count}</span>
                      </div>
                    </div>
                  ))}
                  <div className="bg-gray-50 rounded-lg shadow p-4">
                    <div className="flex justify-between items-center font-medium">
                      <span>الإجمالي</span>
                      <span>{stats.totalPilgrims}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الجنسية</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العدد</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.nationalityStats.map((stat) => (
                        <tr key={stat.nationality}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.nationality}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.count}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">الإجمالي</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stats.totalPilgrims}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">إحصائيات المغادرين</h2>
                
                {/* Mobile View */}
                <div className="block sm:hidden space-y-2">
                  {stats.centers?.map((center) => {
                    const departed = Math.min(center.departed_pilgrims || 0, center.default_capacity);
                    const remaining = Math.max(0, center.default_capacity - departed);
                    
                    return (
                      <div key={center.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                        <div className="font-medium text-gray-900">{center.name}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="space-y-1">
                            <div className="text-gray-500">السعة الافتراضية</div>
                            <div className="font-medium">{center.default_capacity}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-500">العدد الحالي</div>
                            <div className="font-medium">{center.current_count}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-500">المغادرين</div>
                            <div className="font-medium">{departed}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-500">المتبقين</div>
                            <div className="font-medium">{remaining}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="bg-gray-50 rounded-lg shadow p-4 space-y-3">
                    <div className="font-medium">الإجمالي</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="space-y-1">
                        <div className="text-gray-500">السعة الكلية</div>
                        <div className="font-medium">
                          {stats.centers.reduce((sum, center) => sum + center.default_capacity, 0)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-gray-500">العدد الحالي</div>
                        <div className="font-medium">
                          {stats.centers.reduce((sum, center) => sum + center.current_count, 0)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-gray-500">إجمالي المغادرين</div>
                        <div className="font-medium">
                          {stats.centers.reduce((sum, center) => 
                            sum + Math.min(center.departed_pilgrims || 0, center.default_capacity), 0
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-gray-500">إجمالي المتبقين</div>
                        <div className="font-medium">
                          {stats.centers.reduce((sum, center) => 
                            sum + Math.max(0, center.default_capacity - (center.departed_pilgrims || 0)), 0
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المركز</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"> عدد الحجاج</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العدد الحالي</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المغادرين</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقين</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.centers?.map((center) => {
                        const departed = Math.min(center.departed_pilgrims || 0, center.default_capacity);
                        const remaining = Math.max(0, center.default_capacity - departed);
                        
                        return (
                          <tr key={center.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{center.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{center.default_capacity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{center.current_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{departed}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{remaining}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">الإجمالي</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.centers.reduce((sum, center) => sum + center.default_capacity, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.centers.reduce((sum, center) => sum + center.current_count, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.centers.reduce((sum, center) => 
                            sum + Math.min(center.departed_pilgrims || 0, center.default_capacity), 0
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stats.centers.reduce((sum, center) => 
                            sum + Math.max(0, center.default_capacity - (center.departed_pilgrims || 0)), 0
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <h2 className="text-lg font-medium text-gray-900 p-6 pb-0">المغادرين حسب الجنسية</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الجنسية</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد المغادرين</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.departedByNationality.length > 0 ? (
                          stats.departedByNationality.map((item) => (
                            <tr key={item.nationality}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.nationality}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.departed_count}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                              لا توجد بيانات للمغادرين حسب الجنسية
                            </td>
                          </tr>
                        )}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">الإجمالي</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stats.departedByNationality.reduce((sum, item) => sum + item.departed_count, 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <h2 className="text-lg font-medium text-gray-900 p-6 pb-0">المغادرين حسب المراحل</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المرحلة</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الجنسية</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد المغادرين</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المطلوب مغادرتهم</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.departedByStage.map((stage, index) => {
                          const departedCount = stage.departed_count || 0;
                          const requiredDepartures = stage.required_departures || 0;
                          const progress = requiredDepartures > 0 
                            ? Math.round((departedCount / requiredDepartures) * 100) 
                            : 0;

                          return (
                            <tr key={stage.id || index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {stage.stage_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {stage.nationality || 'غير محدد'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{departedCount}</span>
                                  {requiredDepartures > 0 && (
                                    <span className="text-xs text-gray-500">
                                      ({progress}%)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {requiredDepartures}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${getStatusColor(stage.status)}`}>
                                  {getStatusText(stage.status)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">الإجمالي</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stats.departedByStage.reduce((sum, item) => sum + (item.departed_count || 0), 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stats.departedByStage.reduce((sum, item) => sum + (item.required_departures || 0), 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`fixed transition-all duration-300 z-50 ${
          isMobile 
            ? 'bottom-0 right-0 left-0 max-w-full'
            : 'bottom-0 left-4 max-w-sm'
        }`}>
          <div className="bg-white shadow-lg rounded-t-lg overflow-hidden">
            <div 
              className="p-3 border-b flex justify-between items-center cursor-pointer hover:bg-gray-50"
              onClick={handleChatToggle}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <h3 className="font-medium text-sm">المحادثة المباشرة</h3>
                {onlineUsers.length > 0 && (
                  <span className="text-xs text-gray-500">
                    ({onlineUsers.length} متصل)
                  </span>
                )}
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <button 
                    onClick={() => setIsOnlineUsersModalOpen(true)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <UserGroupIcon className="h-4 w-4 text-gray-500" />
                    {onlineUsers.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {onlineUsers.length}
                      </span>
                    )}
                  </button>
                </div>
                {whoIsTyping && (
                  <span className="text-xs text-gray-500 animate-pulse">
                    {whoIsTyping} يكتب...
                  </span>
                )}
                <button className="p-1 hover:bg-gray-100 rounded-full">
                  {isChatMinimized ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {!isChatMinimized && (
              <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[500px]">
                <div 
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth"
                >
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.profile?.role === 'admin' ? 'justify-end' : 'justify-start'} mb-4`}>
                      <div className="group relative">
                        {(msg.profile?.role === 'admin' || msg.profile?.role === 'manager') && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="حذف الرسالة"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        )}
                        
                        <div className={`max-w-[85%] break-words rounded-lg p-3 shadow-sm ${
                          msg.profile?.role === 'admin' 
                            ? 'bg-primary-100 text-primary-800' 
                            : msg.profile?.role === 'manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.message_type === 'image' ? (
                            <div className="relative group">
                              <div className="relative">
                                <img 
                                  src={msg.file_url} 
                                  alt="صورة" 
                                  className="rounded-lg max-w-full h-auto cursor-pointer transition-transform hover:scale-[1.02]"
                                  onClick={() => setFullScreenImage(msg.file_url || null)}
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                              </div>
                              <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (msg.file_url) downloadImage(msg.file_url);
                                  }}
                                  className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                                  title="تحميل الصورة"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.message}</p>
                          )}
                          
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium">
                                {msg.profile?.full_name || 'مستخدم غير معروف'}
                              </span>
                              {msg.profile?.role && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  msg.profile.role === 'admin'
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {msg.profile.role === 'admin' ? 'مدير النظام' : 'مشرف المركز'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-2 sm:p-3 border-t bg-white">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newMessage.trim() && !selectedImage) return;

                      try {
                        let fileUrl = null;
                        if (selectedImage) {
                          fileUrl = await uploadImage(selectedImage);
                        }

                        const messageData = {
                          message: newMessage.trim() || 'صورة',
                          message_type: selectedImage ? 'image' as const : 'text' as const,
                          file_url: fileUrl,
                          timestamp: new Date().toISOString(),
                          is_read: false
                        };

                        await handleSendMessage(
                          messageData.message, 
                          messageData.message_type, 
                          messageData.file_url || undefined
                        );
                        setNewMessage('');
                        setSelectedImage(null);
                      } catch (error) {
                        console.error('Error in form submission:', error);
                        toast.error('حدث خطأ في إرسال الرسالة');
                      }
                    }}
                    className="space-y-2"
                  >
                    {selectedImage && (
                      <div className="relative inline-block">
                        <img
                          src={URL.createObjectURL(selectedImage)}
                          alt="معاينة"
                          className="h-16 sm:h-20 w-auto rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedImage(null)}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full shadow hover:bg-red-600"
                        >
                          <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 rounded-2xl p-1 sm:p-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageLoading}
                        className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                          imageLoading 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'text-gray-400 hover:text-primary-600 hover:bg-gray-100'
                        }`}
                        title={imageLoading ? 'جاري رفع الصورة...' : 'إرفاق صورة'}
                      >
                        {imageLoading ? (
                          <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <PhotoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>

                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={e => {
                            setNewMessage(e.target.value);
                            handleTyping();
                          }}
                          className="w-full bg-transparent border-0 focus:ring-0 text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-3 placeholder-gray-400"
                          placeholder="اكتب رسالتك هنا..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!newMessage.trim() && !selectedImage}
                        className={`
                          min-w-[60px] sm:min-w-[70px]
                          px-3 sm:px-4 
                          py-1.5 sm:py-2
                          text-xs sm:text-sm
                          font-medium
                          rounded-full
                          transition-all duration-200
                          ${!newMessage.trim() && !selectedImage
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                          }
                        `}
                      >
                        إرسال
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
                              return;
                            }
                            setSelectedImage(file);
                          }
                        }}
                      />
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {fullScreenImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setFullScreenImage(null)}
          >
            <div className="relative max-w-4xl w-full">
              <div className="absolute top-4 right-4 flex gap-2">
                <a
                  href={fullScreenImage}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                  title="تحميل الصورة"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullScreenImage(null);
                  }}
                  className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                  title="إغلاق"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <img
                src={fullScreenImage}
                alt="عرض كامل"
                className="max-h-[90vh] max-w-full h-auto mx-auto rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {isOnlineUsersModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">المتصلون الآن</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {onlineUsers.length} مستخدم متصل
                  </p>
                </div>
                <button 
                  onClick={() => setIsOnlineUsersModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {onlineUsers.length > 0 ? (
                  <div className="space-y-6">
                    {/* مدراء النظام */}
                    {groupedUsers.admins.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <ShieldCheckIcon className="h-4 w-4 text-primary-600" />
                          مدراء النظام
                          <span className="text-xs text-gray-500">({groupedUsers.admins.length})</span>
                        </h4>
                        <div className="space-y-2">
                          {groupedUsers.admins.map(user => (
                            <div 
                              key={`${user.id}-${user.presence_ref}`}
                              className="bg-white rounded-lg p-4 shadow-sm border hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {user.profile?.avatar_url ? (
                                    <img 
                                      src={user.profile.avatar_url} 
                                      alt={user.full_name}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                      <UserIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-medium">{user.full_name}</h4>
                                    {user.profile?.position && (
                                      <p className="text-sm text-gray-600">{user.profile.position}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    user.role === 'admin' 
                                      ? 'bg-primary-100 text-primary-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {user.role === 'admin' ? 'مدير النظام' : 'مشرف المركز'}
                                  </span>
                                  {user.last_seen && (
                                    <span className="text-xs text-gray-500 mt-1">
                                      آخر نشاط: {new Date(user.last_seen).toLocaleTimeString('ar-SA')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                {user.profile?.department && (
                                  <div className="flex items-center gap-1">
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    <span>{user.profile.department}</span>
                                  </div>
                                )}
                                {user.center_name && (
                                  <div className="flex items-center gap-1">
                                    <MapPinIcon className="w-4 h-4" />
                                    <span>{user.center_name}</span>
                                  </div>
                                )}
                                {user.profile?.phone && (
                                  <div className="flex items-center gap-1">
                                    <PhoneIcon className="w-4 h-4" />
                                    <span dir="ltr">{user.profile.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* مشرفو المراكز */}
                    {groupedUsers.managers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <BuildingOfficeIcon className="h-4 w-4 text-blue-600" />
                          مشرفو المراكز
                          <span className="text-xs text-gray-500">({groupedUsers.managers.length})</span>
                        </h4>
                        <div className="space-y-2">
                          {groupedUsers.managers.map(user => (
                            <div 
                              key={`${user.id}-${user.presence_ref}`}
                              className="bg-white rounded-lg p-4 shadow-sm border hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {user.profile?.avatar_url ? (
                                    <img 
                                      src={user.profile.avatar_url} 
                                      alt={user.full_name}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                      <UserIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-medium">{user.full_name}</h4>
                                    {user.profile?.position && (
                                      <p className="text-sm text-gray-600">{user.profile.position}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    user.role === 'admin' 
                                      ? 'bg-primary-100 text-primary-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {user.role === 'admin' ? 'مدير النظام' : 'مشرف المركز'}
                                  </span>
                                  {user.last_seen && (
                                    <span className="text-xs text-gray-500 mt-1">
                                      آخر نشاط: {new Date(user.last_seen).toLocaleTimeString('ar-SA')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                {user.profile?.department && (
                                  <div className="flex items-center gap-1">
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    <span>{user.profile.department}</span>
                                  </div>
                                )}
                                {user.center_name && (
                                  <div className="flex items-center gap-1">
                                    <MapPinIcon className="w-4 h-4" />
                                    <span>{user.center_name}</span>
                                  </div>
                                )}
                                {user.profile?.phone && (
                                  <div className="flex items-center gap-1">
                                    <PhoneIcon className="w-4 h-4" />
                                    <span dir="ltr">{user.profile.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* مستخدمون آخرون */}
                    {groupedUsers.others.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-gray-600" />
                          مستخدمون آخرون
                          <span className="text-xs text-gray-500">({groupedUsers.others.length})</span>
                        </h4>
                        <div className="space-y-2">
                          {groupedUsers.others.map(user => (
                            <div 
                              key={`${user.id}-${user.presence_ref}`}
                              className="bg-white rounded-lg p-4 shadow-sm border hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {user.profile?.avatar_url ? (
                                    <img 
                                      src={user.profile.avatar_url} 
                                      alt={user.full_name}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                      <UserIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-medium">{user.full_name}</h4>
                                    {user.profile?.position && (
                                      <p className="text-sm text-gray-600">{user.profile.position}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    user.role === 'admin' 
                                      ? 'bg-primary-100 text-primary-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {user.role === 'admin' ? 'مدير النظام' : 'مشرف المركز'}
                                  </span>
                                  {user.last_seen && (
                                    <span className="text-xs text-gray-500 mt-1">
                                      آخر نشاط: {new Date(user.last_seen).toLocaleTimeString('ar-SA')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                {user.profile?.department && (
                                  <div className="flex items-center gap-1">
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    <span>{user.profile.department}</span>
                                  </div>
                                )}
                                {user.center_name && (
                                  <div className="flex items-center gap-1">
                                    <MapPinIcon className="w-4 h-4" />
                                    <span>{user.center_name}</span>
                                  </div>
                                )}
                                {user.profile?.phone && (
                                  <div className="flex items-center gap-1">
                                    <PhoneIcon className="w-4 h-4" />
                                    <span dir="ltr">{user.profile.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p>لا يوجد متصلين حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="text-lg font-medium text-gray-900 p-6 pb-0">سجل المغادرات</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">المركز</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الدفعة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">العدد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departureHistory?.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.departure_date).toLocaleString('ar-SA')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.center_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.batch_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                          {record.departed_count} حاج
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 