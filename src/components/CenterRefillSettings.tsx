import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Switch } from '@headlessui/react'
import { toast } from 'react-hot-toast'

// تعريف الواجهات
interface CenterStageRefill {
  id: number;
  center_id: number;
  stage_id: number;
  should_refill: boolean;
  is_refilled: boolean;
  refill_date?: string;
  notes?: string;
}

interface RefillLog {
  id: number;
  center_id: number;
  stage_id: number;
  refill_count: number;
  type: 'refill' | 'transition';
  notes?: string;
  created_at: string;
}

interface Stage {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
}

interface Props {
  centerId: number;
  onClose?: () => void;
}

export function CenterRefillSettings({ centerId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [shouldRefill, setShouldRefill] = useState(false);
  const [centerData, setCenterData] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetchCurrentSettings();
  }, [centerId]);

  async function fetchCurrentSettings() {
    try {
      setLoading(true);
      console.log('جلب إعدادات المركز:', centerId);

      // جلب بيانات المركز
      const { data: center } = await supabase
        .from('centers')
        .select('*')
        .eq('id', centerId)
        .single();

      setCenterData(center);

      // جلب إعدادات التعبئة
      const { data: settings } = await supabase
        .from('center_stage_refills')
        .select('*')
        .eq('center_id', centerId)
        .maybeSingle();

      console.log('الإعدادات الحالية:', settings);
      setShouldRefill(settings?.should_refill ?? false);
      setIsSaved(!!settings); // تعيين حالة الحفظ

    } catch (error) {
      console.error('خطأ في جلب الإعدادات:', error);
      toast.error('حدث خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setLoading(true);
      console.log('حفظ الإعدادات للمركز:', { centerId, shouldRefill });

      // حذف الإعدادات القديمة
      await supabase
        .from('center_stage_refills')
        .delete()
        .eq('center_id', centerId);

      // إضافة الإعدادات الجديدة
      const { error: insertError } = await supabase
        .from('center_stage_refills')
        .insert([{
          center_id: centerId,
          stage_id: centerData.stage_id,
          should_refill: shouldRefill,
          is_refilled: false,
          refill_date: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      console.log('تم الحفظ بنجاح');
      toast.success('تم حفظ الإعدادات بنجاح');
      setIsSaved(true);
      onClose?.();
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !centerData) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {centerData && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">المركز:</dt>
                <dd className="text-sm font-medium">{centerData.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">السعة:</dt>
                <dd className="text-sm font-medium">{centerData.default_capacity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">الحالة الحالية:</dt>
                <dd className="text-sm font-medium">
                  {isSaved ? (shouldRefill ? 'مفعّل' : 'معطّل') : 'لم يتم الإعداد بعد'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700">
              عند تفعيل التعبئة التلقائية، سيتم تعبئة المركز تلقائياً عندما يصل عدد الحجاج إلى صفر
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="shouldRefill"
              checked={shouldRefill}
              onChange={(e) => setShouldRefill(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              disabled={loading}
            />
            <label htmlFor="shouldRefill" className="text-gray-700 cursor-pointer select-none">
              تفعيل التعبئة التلقائية
            </label>
          </div>

          <div className="flex justify-start gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="btn btn-primary px-6"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-6"
              disabled={loading}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 