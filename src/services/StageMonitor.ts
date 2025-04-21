import { supabase } from '../lib/supabase'
import { AlertAnalysis, AlertPriority, AlertChannel, Alert } from '../types/alerts'
import { NotificationService } from '../services/NotificationService'

export class StageMonitor {
  // تخزين حالة المراقبة
  private static monitoringInterval: NodeJS.Timeout | null = null
  
  // بدء المراقبة
  static startMonitoring() {
    if (this.monitoringInterval) return
    
    // فحص فوري عند البدء
    this.checkStagesStatus();
    
    // مراقبة التغييرات في المراحل
    supabase
      .channel('stages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stages' },
        async (payload) => {
          const stage = payload.new as any;
          const oldStage = payload.old as any;
          
          console.log('Stage change detected:', {
            stageName: stage.name,
            oldStatus: oldStage?.status,
            newStatus: stage.status,
            endDate: stage.end_date,
            endTime: stage.end_time,
            currentTime: new Date().toISOString()
          });

          if (stage) {
            const now = new Date();
            const endDate = new Date(`${stage.end_date}T${stage.end_time}`);
            
            // إنشاء تنبيه في الحالات التالية:
            // 1. انتهت المرحلة (الوقت الحالي تجاوز وقت النهاية)
            // 2. تغير حالة المرحلة
            // 3. تحليل الحالة يشير إلى الحاجة لتنبيه
            if (now > endDate || 
                oldStage?.status !== stage.status ||
                this.analyzeStageStatus(stage).needsAlert) {
              
              const alertInfo = this.analyzeStageStatus(stage);
              await this.createEnhancedAlert(stage, alertInfo);
            }
          }
        }
      )
      .subscribe();
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkStagesStatus()
    }, 5 * 60 * 1000) // كل 5 دقائق
  }

  // إيقاف المراقبة
  static stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  // فحص حالات المراحل
  private static async checkStagesStatus() {
    try {
      console.log('Checking stages status...');
      const { data: stages, error } = await supabase
        .from('stages')
        .select(`
          id,
          name,
          status,
          start_date,
          start_time,
          end_date,
          end_time,
          current_pilgrims,
          departed_pilgrims,
          required_departures,
          departed_count,
          area_id,
          pilgrim_group_id
        `)
        .in('status', ['active', 'waiting_departure', 'completed']);

      if (error) throw error;

      console.log('Found stages:', stages?.length);
      
      for (const stage of stages || []) {
        const alertInfo = this.analyzeStageStatus(stage);
        console.log(`Stage ${stage.name} - Alert needed:`, alertInfo.needsAlert);
        
        if (alertInfo.needsAlert || alertInfo.timeRemaining <= -1) {
          console.log('Creating alert for stage:', stage.name);
          await this.createEnhancedAlert(stage, alertInfo);
        }
      }
    } catch (error) {
      console.error('Error in stage monitoring:', error);
    }
  }

  private static analyzeStageStatus(stage: any): AlertAnalysis {
    const now = new Date()
    const endDate = new Date(`${stage.end_date}T${stage.end_time}`)
    const timeRemaining = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    const departureRate = stage.required_departures 
      ? (stage.departed_count / stage.required_departures) * 100 
      : 0;

    let priority: AlertPriority = 'low'
    let channels: AlertChannel[] = ['in_app']

    // تحديد الأولوية بناءً على الوقت
    if (timeRemaining <= -1) {
      priority = 'critical'
      channels = ['push', 'sms', 'whatsapp', 'email', 'in_app']
    } else if (timeRemaining <= 6) {
      priority = 'critical'
      channels = ['push', 'sms', 'email', 'in_app']
    } else if (timeRemaining <= 24) {
      priority = 'high'
      channels = ['push', 'email', 'in_app']
    }

    return {
      priority,
      channels,
      timeRemaining,
      occupancyRate: 0, // لا نستخدم نسبة الإشغال حالياً
      departureRate,
      needsAlert: timeRemaining <= 48 || timeRemaining <= -1 || priority === 'critical'
    }
  }

  private static async createEnhancedAlert(stage: any, alertInfo: AlertAnalysis) {
    try {
      const { data: alert, error } = await supabase
        .from('stage_alerts')
        .insert({
          stage_id: stage.id,
          type: alertInfo.priority,
          message: this.generateAlertMessage(stage, alertInfo),
          is_resolved: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  private static generateAlertMessage(stage: any, alertInfo: AlertAnalysis): string {
    if (alertInfo.timeRemaining <= -1) {
      return `المرحلة "${stage.name}" انتهت`;
    }
    
    let timeMessage = '';
    
    if (alertInfo.timeRemaining <= 0) {
      timeMessage = 'تجاوزت وقت النهاية';
    } else if (alertInfo.timeRemaining <= 1) {
      timeMessage = 'متبقي أقل من ساعة';
    } else {
      timeMessage = `متبقي ${Math.round(alertInfo.timeRemaining)} ساعة`;
    }

    const occupancyMessage = alertInfo.occupancyRate 
      ? ` - نسبة الإشغال: ${Math.round(alertInfo.occupancyRate)}%` 
      : '';

    switch (alertInfo.priority) {
      case 'critical':
        return `المرحلة "${stage.name}" ${timeMessage}${occupancyMessage}`;
      case 'high':
        return `المرحلة "${stage.name}" ${timeMessage}${occupancyMessage}`;
      case 'medium':
        return `المرحلة "${stage.name}" ${timeMessage}${occupancyMessage}`;
      default:
        return `المرحلة "${stage.name}" ${timeMessage}`;
    }
  }

  private static async sendNotifications(alert: Alert) {
    if (alert.channels.includes('push')) {
      await NotificationService.sendPushNotification(alert)
    }
    
    if (alert.channels.includes('sms')) {
      await NotificationService.sendSMS(alert)
    }
    
    if (alert.channels.includes('whatsapp')) {
      await NotificationService.sendWhatsApp(alert)
    }
    
    if (alert.channels.includes('email')) {
      await NotificationService.sendEmail(alert)
    }
  }

  // إضافة وظيفة اختبار مع تفاصيل أكثر
  static async testMonitoring() {
    console.log('بدء اختبار المراقبة...')
    
    const { data: stages } = await supabase
        .from('stages')
        .select(`
            id,
            name,
            status,
            start_date,
            start_time,
            end_date,
            end_time,
            current_pilgrims,
            departed_pilgrims,
            required_departures
        `)
        .in('status', ['active', 'waiting_departure'])

    console.log('تم جلب المراحل:', stages)

    if (stages) {
        for (const stage of stages) {
            const now = new Date()
            const startDate = new Date(`${stage.start_date}T${stage.start_time}`)
            const endDate = new Date(`${stage.end_date}T${stage.end_time}`)
            
            console.log('تفاصيل المرحلة:', {
                name: stage.name,
                status: stage.status,
                currentTime: now.toISOString(),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                isBeforeStart: now < startDate,
                isAfterEnd: now > endDate,
                currentPilgrims: stage.current_pilgrims,
                departedPilgrims: stage.departed_pilgrims,
                requiredDepartures: stage.required_departures
            })
            
            const needsAttention = this.needsAttention(stage)
            console.log('هل تحتاج انتباه؟', needsAttention)
            
            if (needsAttention) {
                console.log('محاولة إنشاء تنبيه للمرحلة:', stage.name)
                try {
                    await this.createAlert(stage)
                    console.log('تم إنشاء التنبيه بنجاح')
                } catch (error) {
                    console.error('خطأ في إنشاء التنبيه:', error)
                }
            }
        }
    }
    
    console.log('اكتمل الاختبار')
  }

  private static needsAttention(stage: any): boolean {
    const now = new Date()
    const endDate = new Date(`${stage.end_date}T${stage.end_time}`)
    const startDate = new Date(`${stage.start_date}T${stage.start_time}`)
    const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return (
      stage.status === 'active' && now > endDate ||
      stage.status === 'waiting_departure' && stage.departed_pilgrims >= stage.required_departures ||
      stage.status === 'active' && now < startDate ||
      stage.status === 'active' && stage.current_pilgrims === 0 ||
      stage.status === 'active' && hoursUntilEnd <= 24 && stage.departed_pilgrims === 0 ||
      stage.status === 'active' && stage.current_pilgrims > 15000
    )
  }

  private static async createAlert(stage: any) {
    const now = new Date()
    const endDate = new Date(`${stage.end_date}T${stage.end_time}`)
    const startDate = new Date(`${stage.start_date}T${stage.start_time}`)
    const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    let type: AlertPriority = 'medium'
    let message = ''
    
    if (stage.status === 'active' && now > endDate) {
      message = `المرحلة "${stage.name}" تجاوزت وقت النهاية`
      type = 'critical'
    } else if (stage.status === 'waiting_departure' && stage.departed_pilgrims >= stage.required_departures) {
      message = `المرحلة "${stage.name}" اكتمل عدد المغادرين المطلوب`
      type = 'high'
    } else if (stage.status === 'active' && now < startDate) {
      message = `المرحلة "${stage.name}" نشطة قبل وقت البداية المحدد`
      type = 'high'
    } else if (stage.status === 'active' && stage.current_pilgrims === 0) {
      message = `المرحلة "${stage.name}" نشطة ولا يوجد بها حجاج`
      type = 'medium'
    } else if (stage.status === 'active' && hoursUntilEnd <= 24 && stage.departed_pilgrims === 0) {
      message = `المرحلة "${stage.name}" على وشك الانتهاء ولم يغادر أي حاج`
      type = 'critical'
    } else if (stage.status === 'active' && stage.current_pilgrims > 15000) {
      message = `المرحلة "${stage.name}" تجاوزت العدد المتوقع من الحجاج (${stage.current_pilgrims} حاج)`
      type = 'critical'
    }

    try {
      await supabase
        .from('stage_alerts')
        .insert({
          stage_id: stage.id,
          type,
          message,
          created_at: new Date().toISOString(),
          is_resolved: false
        })
    } catch (error) {
      console.error('Error creating alert:', error)
      throw error
    }
  }
} 