import { Stage } from '../types/stage'
    
export function trackStageChanges(stage: Stage, stats: any) {
  console.log('Stage Changes:', {
    stageId: stage.id,
    stageName: stage.name,
    nationality: stage.nationality,
    timestamp: new Date().toISOString(),
    changes: stats,
    currentStats: stats
  })
}   