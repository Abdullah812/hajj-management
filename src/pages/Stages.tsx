import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PlusIcon } from '@heroicons/react/24/outline'
import { StageModal } from '../components/StageModal'
import { DeleteConfirmation } from '../components/DeleteConfirmation'

type Stage = {
  id: number
  name: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  max_pilgrims: number
  current_pilgrims: number
  status: 'active' | 'inactive' | 'completed'
}

export function Stages() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Stage | undefined>()
  const [deleteStage, setDeleteStage] = useState<Stage | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [stageToStart, setStageToStart] = useState<Stage | null>(null)

  useEffect(() => {
    fetchStages()
  }, [])

  async function fetchStages() {
    try {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) throw error
      setStages(data || [])
    } catch (error) {
      console.error('Error fetching stages:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleAddNew() {
    setSelectedStage(undefined)
    setShowModal(true)
  }

  function handleEdit(stage: Stage) {
    setSelectedStage(stage)
    setShowModal(true)
  }

  async function handleDelete(stage: Stage) {
    setDeleteLoading(true)
    try {
      const { data: centers } = await supabase
        .from('centers')
        .select('id')
        .eq('stage_id', stage.id)

      if (centers && centers.length > 0) {
        alert('لا يمكن حذف المرحلة لأنها مرتبطة بمراكز. قم بإزالة ارتباط المراكز أولاً.')
        return
      }

      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('id', stage.id)

      if (error) throw error
      setStages(stages.filter(s => s.id !== stage.id))
    } catch (error) {
      console.error('Error deleting stage:', error)
      alert('حدث خطأ أثناء حذف المرحلة')
    } finally {
      setDeleteLoading(false)
      setDeleteStage(null)
    }
  }

  async function handleStartStage(stage: Stage) {
    try {
      const { error } = await supabase
        .from('stages')
        .update({ 
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          start_time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        })
        .eq('id', stage.id)

      if (error) throw error
      
      await fetchStages()
      setStageToStart(null)
    } catch (error) {
      console.error('Error starting stage:', error)
      alert('حدث خطأ أثناء بدء المرحلة')
    }
  }

  async function handlePauseStage(stage: Stage) {
    try {
      const { error } = await supabase
        .from('stages')
        .update({ status: 'inactive' })
        .eq('id', stage.id)

      if (error) throw error
      await fetchStages()
    } catch (error) {
      console.error('Error pausing stage:', error)
      alert('حدث خطأ أثناء إيقاف المرحلة')
    }
  }

  async function handleExtendStage(stage: Stage, days: number) {
    try {
      const newEndDate = new Date(stage.end_date)
      newEndDate.setDate(newEndDate.getDate() + days)

      const { error } = await supabase
        .from('stages')
        .update({ 
          end_date: newEndDate.toISOString().split('T')[0]
        })
        .eq('id', stage.id)

      if (error) throw error
      await fetchStages()
    } catch (error) {
      console.error('Error extending stage:', error)
      alert('حدث خطأ أثناء تمديد المرحلة')
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">المراحل</h1>
        <button
          onClick={handleAddNew}
          className="btn btn-primary flex items-center dark:bg-primary-600 dark:hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 ml-2" />
          إضافة مرحلة
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        </div>
      ) : stages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">لا توجد مراحل مضافة</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => {
            const now = new Date()
            const startDate = new Date(stage.start_date)
            const endDate = new Date(stage.end_date)
            
            let stageStatus = ''
            let statusColor = ''
            let timeRemaining = ''

            if (now < startDate) {
              stageStatus = 'قادمة'
              statusColor = 'bg-blue-100 text-blue-800'
              const diff = startDate.getTime() - now.getTime()
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
              timeRemaining = `تبدأ خلال ${days} يوم`
            } else if (now >= startDate && now <= endDate) {
              stageStatus = 'نشطة'
              statusColor = 'bg-green-100 text-green-800'
              const diff = endDate.getTime() - now.getTime()
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
              timeRemaining = `متبقي ${days} يوم`
            } else {
              stageStatus = 'منتهية'
              statusColor = 'bg-gray-100 text-gray-800'
              timeRemaining = 'انتهت المرحلة'
            }

            return (
              <div key={stage.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{stage.name}</h3>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${stageStatus === 'قادمة' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : ''}
                      ${stageStatus === 'نشطة' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : ''}
                      ${stageStatus === 'منتهية' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : ''}
                    `}>
                      {stageStatus}
                    </span>
                  </div>
                  
                  <div className="flex flex-col space-y-1 mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      من {formatDate(stage.start_date)} {stage.start_time}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      إلى {formatDate(stage.end_date)} {stage.end_time}
                    </p>
                    
                    {now < startDate && stage.status !== 'active' && (
                      <button
                        onClick={() => setStageToStart(stage)}
                        className="mt-2 w-full btn btn-primary btn-sm"
                      >
                        بدء المرحلة الآن
                      </button>
                    )}
                    
                    {now >= startDate && now <= endDate && (
                      <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          متبقي: {timeRemaining}
                        </p>
                        <div className="mt-2 flex gap-2">
                          {stage.status === 'active' ? (
                            <button
                              onClick={() => handlePauseStage(stage)}
                              className="btn btn-warning btn-sm flex-1"
                            >
                              إيقاف مؤقت
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartStage(stage)}
                              className="btn btn-success btn-sm flex-1"
                            >
                              استئناف
                            </button>
                          )}
                          <button
                            onClick={() => handleExtendStage(stage, 1)}
                            className="btn btn-secondary btn-sm flex-1"
                          >
                            تمديد يوم
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {now > endDate && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          انتهت المرحلة
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                      <span>الحجاج المسجلين</span>
                      <span className="font-medium">{stage.current_pilgrims} / {stage.max_pilgrims}</span>
                    </div>
                    <div className="relative">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            stage.current_pilgrims >= stage.max_pilgrims
                              ? 'bg-red-500 dark:bg-red-600'
                              : stage.current_pilgrims >= stage.max_pilgrims * 0.8
                                ? 'bg-yellow-500 dark:bg-yellow-600'
                                : 'bg-primary-600 dark:bg-primary-500'
                          }`}
                          style={{ width: `${Math.min((stage.current_pilgrims / stage.max_pilgrims) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">نسبة الإشغال</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {Math.round((stage.current_pilgrims / stage.max_pilgrims) * 100)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">المتبقي</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {stage.max_pilgrims - stage.current_pilgrims}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3 space-x-reverse">
                    <button
                      onClick={() => handleEdit(stage)}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      تحرير
                    </button>
                    <button
                      onClick={() => setDeleteStage(stage)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <StageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        stage={selectedStage}
        onSuccess={fetchStages}
      />

      <DeleteConfirmation
        isOpen={!!deleteStage}
        onClose={() => setDeleteStage(null)}
        onConfirm={() => deleteStage && handleDelete(deleteStage)}
        title="حذف المرحلة"
        message={`هل أنت متأكد من حذف مرحلة "${deleteStage?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        loading={deleteLoading}
      />

      <DeleteConfirmation
        isOpen={!!stageToStart}
        onClose={() => setStageToStart(null)}
        onConfirm={() => stageToStart && handleStartStage(stageToStart)}
        title="تأكيد بدء المرحلة"
        message={`هل أنت متأكد من بدء مرحلة "${stageToStart?.name}" الآن؟ سيتم تحديث تاريخ ووقت البدء إلى الوقت الحالي.`}
        confirmText="بدء المرحلة"
        confirmButtonClass="btn-primary"
        loading={loading}
      />
    </div>
  )
} 