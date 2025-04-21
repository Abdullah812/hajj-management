export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';
export type AlertChannel = 'push' | 'sms' | 'email' | 'whatsapp' | 'in_app';

export interface AlertAnalysis {
  priority: AlertPriority;
  channels: AlertChannel[];
  needsAlert: boolean;
  timeRemaining: number;
  occupancyRate: number;
  departureRate: number;
}

export interface Alert {
  id: number;
  stage_id: number;
  type: AlertPriority;
  message: string;
  created_at: string;
  resolved_at?: string;
  is_resolved: boolean;
  channels: AlertChannel[];
  metadata: {
    timeRemaining?: number;
    occupancyRate?: number;
    departureRate?: number;
    currentPilgrims?: number;
    maxCapacity?: number;
  };
} 