import { Stage } from "../types/stage"

export function validateStageCounts(stage: Stage) {
  const errors = []
  
  if (stage.current_pilgrims < 0) {
    errors.push('العدد الحالي لا يمكن أن يكون سالباً')
  }
  
  if ((stage.departed_pilgrims || 0) < 0) {
    errors.push('عدد المغادرين لا يمكن أن يكون سالباً')
  }     
  
  if (stage.status === 'waiting_departure' && !stage.nationality) {
    errors.push('يجب تحديد الجنسية للمراحل في وضع الانتظار')
  }
  
  return errors
} 