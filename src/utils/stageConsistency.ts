import { Stage } from '../types/stage'
import { calculateStageStats } from './stageCalculations'
import { supabase } from '../lib/supabase'

export function checkStageConsistency(stages: Stage[]) {
  const consistencyReport = {
    hasErrors: false,
    details: [] as string[]
  }
  
  stages.forEach(stage => {
    const stats = calculateStageStats(stage)
    const storedTotal = stage.total_pilgrims || stage.current_pilgrims
    
    if (stats.totalPilgrims !== storedTotal) {
      consistencyReport.hasErrors = true
      consistencyReport.details.push(
        `عدم تطابق في المرحلة ${stage.name}: ` +
        `المحسوب (${stats.totalPilgrims}) ≠ ` +
        `المخزن (${storedTotal})`
      )
    }
  })
  
  return consistencyReport
}

export const checkWaitingStages = async () => {
  try {
    // جلب جميع المراحل أولاً
    const { data: stages } = await supabase
      .from('stages')
      .select('*')
    
    const { data: waitingStages } = await supabase
      .from('stages')
      .select('*')
      .eq('status', 'waiting_departure')

    if (!waitingStages || !stages) return

    for (const waitingStage of waitingStages) {
      // حساب المغادرين من نفس الجنسية فقط
      const departedFromSameNationality = stages
        .filter(s => 
          s.nationality === waitingStage.nationality &&
          s.id < waitingStage.id &&
          (s.status === 'completed' || s.status === 'active')
        )
        .reduce((sum, s) => sum + (s.departed_pilgrims || 0), 0)

      // التحقق من اكتمال العدد المطلوب
      if (departedFromSameNationality >= waitingStage.required_departures) {
        // تفعيل المرحلة
        await supabase
          .from('stages')
          .update({ status: 'active' })
          .eq('id', waitingStage.id)
      }
    }
  } catch (error) {
    console.error('Error checking waiting stages:', error)
  }
} 