export type User = {
  id: string
  email: string
  role: 'admin' | 'supervisor' | 'user'
  created_at: string
  last_sign_in_at: string | null
}

export type Center = {
  id: number
  name: string
  location: string
  capacity: number
  status: 'active' | 'inactive'
  created_at: string
}

export type Stage = {
  id: number
  name: string
  start_date: string
  end_date: string
  max_pilgrims: number
  current_pilgrims: number
  status: 'active' | 'inactive' | 'completed'
}

export type Pilgrim = {
  id: number
  name: string
  passport_number: string
  nationality: string
  stage_id: number
  center_id: number
  status: 'pending' | 'arrived' | 'completed'
  arrival_date: string | null
  departure_date: string | null
  stage?: Stage
  center?: Center
} 