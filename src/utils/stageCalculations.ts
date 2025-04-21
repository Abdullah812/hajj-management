import { Stage } from "../types/stage";

export function calculateStageStats(stage: Stage) {
  return {
    totalPilgrims: stage.current_pilgrims + (stage.departed_pilgrims || 0),
    remainingPilgrims: stage.current_pilgrims,
    departurePercentage: Math.round(
      ((stage.departed_pilgrims || 0) / 
      (stage.current_pilgrims + (stage.departed_pilgrims || 0))) * 100
    )
  }
} 