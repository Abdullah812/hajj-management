import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

interface Center {
  id: number;
  name: string;
  location: string;
  current_count: number;
  default_capacity: number;
  status: 'active' | 'inactive';
  stage_id?: number;
}

interface Stage {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  order: number;
}

interface CenterFormData {
  name: string;
  location: string;
  current_count: number;
  default_capacity: number;
  stage_id: number | '';
  status: 'active' | 'inactive';
}

interface CenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  center?: Center;
  stages?: Stage[];
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function CenterModal({ isOpen, onClose, center, stages, onSuccess, children }: CenterModalProps) {
  const [loading, setLoading] = useState(false);
  const [error] = useState('');
  const [formData, setFormData] = useState<CenterFormData>({
    name: '',
    location: '',
    current_count: 0,
    default_capacity: 0,
    stage_id: '',
    status: 'active'
  });

  useEffect(() => {
    if (center) {
      setFormData({
        name: center.name,
        location: center.location,
        current_count: center.current_count,
        default_capacity: center.default_capacity || 0,
        stage_id: center.stage_id || '',
        status: center.status
      });
    } else {
      setFormData({
        name: '',
        location: '',
        current_count: 0,
        default_capacity: 0,
        stage_id: '',
        status: 'active'
      });
    }
  }, [center]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // التحقق من العدد
      if (formData.current_count < 0) {
        toast.error('لا يمكن أن يكون عدد الحجاج سالباً');
        return;
      }

      if (formData.current_count > formData.default_capacity) {
        toast.error(`لا يمكن أن يتجاوز عدد الحجاج السعة الافتراضية (${formData.default_capacity})`);
        return;
      }

      const data = {
        name: formData.name,
        location: formData.location,
        current_count: formData.current_count,
        default_capacity: formData.default_capacity,
        status: formData.status,
        stage_id: formData.stage_id ? Number(formData.stage_id) : null
      }

      if (center) {
        const { error } = await supabase
          .from('centers')
          .update(data)
          .eq('id', center.id)
        if (error) throw error
        toast.success('تم تحديث المركز بنجاح')
      } else {
        const { error } = await supabase
          .from('centers')
          .insert([data])
        if (error) throw error
        toast.success('تم إضافة المركز بنجاح')
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error saving center:', error)
      toast.error('حدث خطأ أثناء حفظ المركز')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg w-full max-w-md mx-4 p-6">
          <div className="absolute left-4 top-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {children ? (
            // إذا كان هناك children، اعرضه مباشرة
            children
          ) : (
            // وإلا اعرض النموذج الأصلي
            <>
              <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                {center ? 'تحرير المركز' : 'إضافة مركز جديد'}
              </Dialog.Title>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    اسم المركز
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 input"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    الموقع
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="mt-1 input"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="default_capacity" className="block text-sm font-medium text-gray-700">
                    السعة الافتراضية للمركز
                  </label>
                  <input
                    type="number"
                    id="default_capacity"
                    value={formData.default_capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_capacity: Number(e.target.value) }))}
                    className="mt-1 input"
                    disabled={loading}
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="current_count" className="block text-sm font-medium text-gray-700">
                    عدد الحجاج
                  </label>
                  <input
                    type="number"
                    id="current_count"
                    value={formData.current_count}
                    onChange={(e) => {
                      const newValue = Number(e.target.value);
                      if (newValue >= 0 && newValue <= formData.default_capacity) {
                        setFormData(prev => ({ ...prev, current_count: newValue }))
                      } else {
                        // إذا كان العدد غير صالح، نعرض رسالة خطأ
                        if (newValue < 0) {
                          toast.error('لا يمكن إدخال عدد سالب');
                        } else if (newValue > formData.default_capacity) {
                          toast.error(`لا يمكن تجاوز السعة الافتراضية (${formData.default_capacity})`);
                        }
                      }
                    }}
                    className="mt-1 input"
                    disabled={loading}
                    min="0"
                    max={formData.default_capacity}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    الحالة
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="mt-1 input"
                    disabled={loading}
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="stage" className="block text-sm font-medium text-gray-700">
                    المرحلة
                  </label>
                  <div className="mt-1 flex gap-2">
                    <select
                      id="stage"
                      value={formData.stage_id}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        stage_id: e.target.value ? Number(e.target.value) : '' 
                      }))}
                      className="input flex-1"
                      disabled={loading}
                    >
                      <option value="">اختر المرحلة</option>
                      {(stages || []).map((stage) => {
                        // التحقق من حالة المرحلة بناءً على التاريخ
                        const now = new Date()
                        const startDate = new Date(stage.start_date)
                        const endDate = new Date(stage.end_date)
                        
                        let stageStatus = ''
                        if (now < startDate) {
                          stageStatus = 'قادمة'
                        } else if (now >= startDate && now <= endDate) {
                          stageStatus = 'نشطة'
                        } else {
                          stageStatus = 'منتهية'
                        }

                        // حساب الوقت المتبقي
                        let timeRemaining = ''
                        if (now < endDate) {
                          const diff = endDate.getTime() - now.getTime()
                          const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
                          timeRemaining = ` (متبقي ${days} يوم)`
                        }

                        return (
                          <option key={stage.id} value={stage.id}>
                            {stage.name} - {stageStatus}{timeRemaining}
                          </option>
                        )
                      })}
                    </select>
                    {center?.stage_id && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, stage_id: '' }))}
                        className="btn btn-secondary"
                        disabled={loading}
                      >
                        إلغاء المرحلة
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    اختر المرحلة المناسبة للمركز - سيتم عرض الحالة والوقت المتبقي لكل مرحلة
                  </p>
                </div>

                <div className="flex justify-end space-x-3 space-x-reverse">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'جاري الحفظ...' : center ? 'حفظ التغييرات' : 'إضافة المركز'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
} 