import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'

interface Center {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: 'active' | 'inactive';
  stage_id?: string;
}

interface Stage {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'upcoming' | 'completed';
}

type CenterModalProps = {
  isOpen: boolean
  onClose: () => void
  center?: Center
  stages: Stage[]
  onSuccess: () => void
}

export function CenterModal({ isOpen, onClose, center, stages, onSuccess }: CenterModalProps) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [loading, setLoading] = useState(false)
  const [error] = useState('')
  const [stageId, setStageId] = useState(center?.stage_id || '')

  useEffect(() => {
    if (center) {
      setName(center.name)
      setLocation(center.location)
      setCapacity(center.capacity.toString())
      setStatus(center.status)
      setStageId(center.stage_id || '')
    } else {
      setName('')
      setLocation('')
      setCapacity('')
      setStatus('active')
      setStageId('')
    }
  }, [center])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        name,
        location,
        capacity: Number(capacity),
        status,
        stage_id: stageId || null // يمكن أن يكون null إذا لم يتم اختيار مرحلة
      }

      if (center) {
        // تحديث
        const { error } = await supabase
          .from('centers')
          .update(data)
          .eq('id', center.id)
        if (error) throw error
      } else {
        // إضافة جديد
        const { error } = await supabase
          .from('centers')
          .insert([data])
        if (error) throw error
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving center:', error)
      alert('حدث خطأ أثناء حفظ المركز')
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                الموقع
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                السعة
              </label>
              <input
                type="number"
                id="capacity"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="mt-1 input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                الحالة
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
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
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="input flex-1"
                  disabled={loading}
                >
                  <option value="">اختر المرحلة</option>
                  {stages.map((stage) => {
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
                    onClick={() => setStageId('')}
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
        </div>
      </div>
    </Dialog>
  )
} 