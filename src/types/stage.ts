export interface StageAlert {
  id: number
  stage_id: number
  type: 'status_change_needed' | 'capacity_warning' | 'time_warning'
  message: string
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
  stages?: {
    name: string
  }
}

export interface StageLog {
  id: number
  stage_id: number
  status: string
  current_pilgrims: number
  departed_pilgrims: number
  timestamp: string
  created_at: string
}

export type Stage = {
  id: number
  name: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  current_pilgrims: number
  max_pilgrims: number
  status: 'active' | 'inactive' | 'completed' | 'waiting_departure'
  area_id: number
  pilgrim_group_id?: number
  required_departures?: number
  nationality?: string
  pilgrim_groups?: {
    nationality: string
    departed_count: number
  }
  departed_pilgrims: number
  departed_count?: number
  total_pilgrims: number
}