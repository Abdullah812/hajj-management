import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'

type StageModalProps = {
  isOpen: boolean
  onClose: () => void
  stage?: {
    id: number
    name: string
    max_pilgrims: number
    start_date: string
    start_time: string
    end_date: string
    end_time: string
    status: 'active' | 'inactive' | 'completed'
  }
  onSuccess: () => void
}

export function StageModal({ isOpen, onClose, stage, onSuccess }: StageModalProps) {
  const [name, setName] = useState('')
  const [maxPilgrims, setMaxPilgrims] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'completed'>('inactive')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (stage) {
      setName(stage.name)
      setMaxPilgrims(stage.max_pilgrims.toString())
      setStartDate(stage.start_date.split('T')[0])
      setStartTime(stage.start_time || '')
      setEndDate(stage.end_date.split('T')[0])
      setEndTime(stage.end_time || '')
      setStatus(stage.status)
    } else {
      setName('')
      setMaxPilgrims('')
      setStartDate('')
      setStartTime('')
      setEndDate('')
      setEndTime('')
      setStatus('inactive')
    }
  }, [stage])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!name || !startDate || !endDate || !maxPilgrims || !startTime || !endTime) {
        throw new Error('جميع الحقول مطلوبة')
      }

      const pilgrimsNum = parseInt(maxPilgrims)
      if (isNaN(pilgrimsNum) || pilgrimsNum <= 0) {
        throw new Error('عدد الحجاج يجب أن يكون رقماً موجباً')
      }

      const startDateTime = new Date(`${startDate}T${startTime}`)
      const endDateTime = new Date(`${endDate}T${endTime}`)

      if (startDateTime >= endDateTime) {
        throw new Error('وقت وتاريخ البداية يجب أن يكون قبل وقت وتاريخ النهاية')
      }

      const stageData = {
        name,
        max_pilgrims: pilgrimsNum,
        start_date: startDate,
        start_time: startTime,
        end_date: endDate,
        end_time: endTime,
        status
      }

      if (stage?.id) {
        const { error: dbError } = await supabase
          .from('stages')
          .update(stageData)
          .eq('id', stage.id)

        if (dbError) throw dbError
      } else {
        const { error: dbError } = await supabase
          .from('stages')
          .insert([{ ...stageData, current_pilgrims: 0 }])

        if (dbError) throw dbError
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      setError(error.message)
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            {stage ? 'تحرير المرحلة' : 'إضافة مرحلة جديدة'}
          </Dialog.Title>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                اسم المرحلة
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
              <label htmlFor="maxPilgrims" className="block text-sm font-medium text-gray-700">
                عدد الحجاج
              </label>
              <input
                type="number"
                id="maxPilgrims"
                value={maxPilgrims}
                onChange={(e) => setMaxPilgrims(e.target.value)}
                className="mt-1 input"
                disabled={loading}
                min="1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 input"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                  وقت البداية
                </label>
                <input
                  type="time"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  تاريخ النهاية
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 input"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                  وقت النهاية
                </label>
                <input
                  type="time"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 input"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                الحالة
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'completed')}
                className="mt-1 input"
                disabled={loading}
              >
                <option value="inactive">غير نشطة</option>
                <option value="active">نشطة</option>
                <option value="completed">مكتملة</option>
              </select>
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
                {loading ? 'جاري الحفظ...' : stage ? 'حفظ التغييرات' : 'إضافة المرحلة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 