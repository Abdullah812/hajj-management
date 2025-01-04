export class AIService {
  async predictCrowding(centers: any[]) {
    try {
      if (!centers || centers.length === 0) {
        return 'لا توجد بيانات كافية للتحليل';
      }

      // تحليل الاتجاه العام
      const totalOccupancy = centers.reduce((acc, center) => {
        const occupancy = center.capacity > 0 
          ? (center.current_count / center.capacity) * 100 
          : 0;
        return acc + occupancy;
      }, 0) / centers.length;

      // تحديد المراكز المزدحمة
      const crowdedCenters = centers.filter(center => 
        (center.current_count / center.capacity) * 100 > 70
      );

      // بناء رسالة التنبؤ
      let prediction = '';
      
      if (totalOccupancy > 90) {
        prediction = 'تحذير عاجل: ازدحام شديد متوقع\n';
        prediction += '• يجب تحويل الحجاج للمراكز البديلة فوراً\n';
        prediction += '• فتح جميع المسارات الاحتياطية\n';
        prediction += '• تفعيل خطة الطوارئ';
      } else if (totalOccupancy > 70) {
        prediction = 'تنبيه: احتمال ازدحام في الساعات القادمة\n';
        prediction += crowdedCenters.length > 0 
          ? `• المراكز المزدحمة: ${crowdedCenters.map(c => c.name).join(', ')}\n`
          : '';
        prediction += '• يرجى توجيه الحجاج للمراكز الأقل ازدحاماً';
      } else if (totalOccupancy > 50) {
        prediction = 'الوضع طبيعي مع احتمال زيادة متوسطة\n';
        prediction += '• استمرار المراقبة الدورية\n';
        prediction += '• الاستعداد لزيادة محتملة في الأعداد';
      } else {
        prediction = 'الوضع مستقر\n';
        prediction += '• يمكن استقبال المزيد من الحجاج\n';
        prediction += '• الحفاظ على المستوى الحالي من الخدمات';
      }

      return prediction;
    } catch (error) {
      console.error('خطأ في التحليل:', error);
      return 'غير متاح حالياً';
    }
  }

  async suggestOptimalDistribution(stageData: any) {
    try {
      if (!stageData || typeof stageData.current_pilgrims === 'undefined') {
        return 'لا توجد بيانات كافية للتحليل';
      }

      const occupancyRate = (stageData.current_pilgrims / stageData.max_pilgrims) * 100;

      if (occupancyRate > 90) {
        return 'يجب إعادة توزيع الحجاج على المراحل الأخرى فوراً.';
      } else if (occupancyRate > 70) {
        return 'ينصح بتوجيه الحجاج الجدد إلى المراحل الأقل ازدحاماً.';
      } else if (occupancyRate > 50) {
        return 'التوزيع الحالي مناسب مع إمكانية استيعاب المزيد.';
      } else {
        return 'يمكن استقبال المزيد من الحجاج في هذه المرحلة.';
      }
    } catch (error) {
      console.error('خطأ في التحليل:', error);
      return 'غير متاح حالياً';
    }
  }
}

export const aiService = new AIService(); 