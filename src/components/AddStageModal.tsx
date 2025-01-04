import { useState } from 'react'
import { Modal } from './Modal'
import { supabase } from '../lib/supabase'

type AddStageModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddStageModal({ isOpen, onClose, onSuccess }: AddStageModalProps) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [maxPilgrims, setMaxPilgrims] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('stages')
        .insert([
          {
            name,
            start_date: startDate,
            end_date: endDate,
            max_pilgrims: parseInt(maxPilgrims),
            current_pilgrims: 0,
            status: 'inactive'
          }
        ])

      if (error) throw error

      onSuccess()
      onClose()
      setName('')
      setStartDate('')
      setEndDate('')
      setMaxPilgrims('')
    } catch (err) {
      setError('حدث خطأ أثناء إضافة المرحلة')
      console.error('Error adding stage:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة مرحلة جديدة">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            اسم المرحلة
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            تاريخ البداية
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            تاريخ النهاية
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="maxPilgrims" className="block text-sm font-medium text-gray-700">
            العدد الأقصى للحجاج
          </label>
          <input
            type="number"
            id="maxPilgrims"
            value={maxPilgrims}
            onChange={(e) => setMaxPilgrims(e.target.value)}
            required
            min="1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:col-start-2"
          >
            {loading ? 'جاري الإضافة...' : 'إضافة'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  )
} 