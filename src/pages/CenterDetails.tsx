import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Center = {
  id: number
  name: string
  location: string
  manager_id: string
  status: 'active' | 'inactive'
}

export function CenterDetails() {
  const { id } = useParams()
  const [center, setCenter] = useState<Center | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCenter()
  }, [id])

  async function fetchCenter() {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCenter(data)
    } catch (error) {
      console.error('Error fetching center:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>جاري التحميل...</div>
  }

  if (!center) {
    return <div>لم يتم العثور على المركز</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{center.name}</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">الموقع</dt>
            <dd className="mt-1 text-sm text-gray-900">{center.location}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">الحالة</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {center.status === 'active' ? 'نشط' : 'غير نشط'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
} 