import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { supabase } from '../lib/supabase'

type AddPilgrimModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type Stage = {
  id: number
  name: string
}

type Center = {
  id: number
  name: string
}

export function AddPilgrimModal({ isOpen, onClose, onSuccess }: AddPilgrimModalProps) {
  const [name, setName] = useState('')
  const [passportNumber, setPassportNumber] = useState('')
  const [nationality, setNationality] = useState('')
  const [stageId, setStageId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [stages, setStages] = useState<Stage[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchStagesAndCenters()
    }
  }, [isOpen])

  async function fetchStagesAndCenters() {
    try {
      const [stagesResponse, centersResponse] = await Promise.all([
        supabase.from('stages').select('id, name').eq('status', 'active'),
        supabase.from('centers').select('id, name').eq('status', 'active')
      ])

      if (stagesResponse.error) throw stagesResponse.error
      if (centersResponse.error) throw centersResponse.error

      setStages(stagesResponse.data || [])
      setCenters(centersResponse.data || [])
    } catch (error) {
      console.error('Error fetching stages and centers:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('pilgrims')
        .insert([
          {
            name,
            passport_number: passportNumber,
            nationality,
            stage_id: parseInt(stageId),
            center_id: parseInt(centerId),
            status: 'pending'
          }
        ])

      if (error) throw error

      onSuccess()
      onClose()
      setName('')
      setPassportNumber('')
      setNationality('')
      setStageId('')
      setCenterId('')
    } catch (err) {
      setError('حدث خطأ أثناء إضافة الحاج')
      console.error('Error adding pilgrim:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة حاج جديد">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            الاسم
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
          <label htmlFor="passportNumber" className="block text-sm font-medium text-gray-700">
            رقم الجواز
          </label>
          <input
            type="text"
            id="passportNumber"
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
            الجنسية
          </label>
          <input
            type="text"
            id="nationality"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="stageId" className="block text-sm font-medium text-gray-700">
            المرحلة
          </label>
          <select
            id="stageId"
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">اختر المرحلة</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="centerId" className="block text-sm font-medium text-gray-700">
            المركز
          </label>
          <select
            id="centerId"
            value={centerId}
            onChange={(e) => setCenterId(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">اختر المركز</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
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