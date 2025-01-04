import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'

type PilgrimGroup = {
  id: number
  nationality: string
  count: number
  status: 'registered' | 'arrived' | 'completed'
}

interface PilgrimModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editGroup?: PilgrimGroup
}

export function PilgrimModal({ isOpen, onClose, onSuccess, editGroup }: PilgrimModalProps) {
  const [nationality, setNationality] = useState('')
  const [count, setCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editGroup) {
      setNationality(editGroup.nationality)
      setCount(editGroup.count)
    } else {
      setNationality('')
      setCount(1)
    }
  }, [editGroup])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!nationality || count < 1) {
        throw new Error('جميع الحقول مطلوبة')
      }

      if (editGroup) {
        // تحديث مجموعة موجودة
        const { error } = await supabase
          .from('pilgrim_groups')
          .update({
            nationality,
            count,
          })
          .eq('id', editGroup.id)

        if (error) throw error
      } else {
        // إضافة مجموعة جديدة
        const { error } = await supabase
          .from('pilgrim_groups')
          .insert([{
            nationality,
            count,
            status: 'registered'
          }])

        if (error) throw error
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
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            {editGroup ? 'تعديل مجموعة حجاج' : 'إضافة مجموعة حجاج'}
          </Dialog.Title>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
                الجنسية
              </label>
              <input
                type="text"
                id="nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="mt-1 input w-full"
                disabled={loading}
                placeholder="مثال: إيران"
              />
            </div>

            <div>
              <label htmlFor="count" className="block text-sm font-medium text-gray-700">
                عدد الحجاج
              </label>
              <input
                type="number"
                id="count"
                min="1"
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 input w-full"
                disabled={loading}
              />
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
                {loading ? 'جاري الحفظ...' : editGroup ? 'حفظ التغييرات' : 'إضافة المجموعة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 