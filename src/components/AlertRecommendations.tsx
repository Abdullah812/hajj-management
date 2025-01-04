interface AlertRecommendationsProps {
  centers: Array<{
    id: number;
    name: string;
    capacity: number;
    current_count: number;
  }>;
  stageData: {
    name: string;
    max_pilgrims: number;
    current_pilgrims: number;
  };
}

export function AlertRecommendations({ centers, stageData }: AlertRecommendationsProps) {
  const getAlertLevel = (occupancy: number) => {
    if (occupancy > 90) return 'high';
    if (occupancy > 70) return 'medium';
    return 'low';
  };

  const centersStatus = centers.map(center => ({
    name: center.name,
    occupancy: center.capacity > 0 ? Math.round((center.current_count / center.capacity) * 100) : 0,
  }));

  const stageOccupancy = stageData.max_pilgrims > 0 
    ? Math.round((stageData.current_pilgrims / stageData.max_pilgrims) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* تنبيهات المراكز */}
      {centersStatus.map(center => (
        <div key={center.name} className={`p-4 rounded-lg ${
          getAlertLevel(center.occupancy) === 'high' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
          getAlertLevel(center.occupancy) === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
          'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
        }`}>
          <h4 className="font-medium mb-2">{center.name}</h4>
          <p>{
            getAlertLevel(center.occupancy) === 'high' ? `تنبيه: ${center.name} مزدحم جداً (${center.occupancy}%). يرجى توجيه الحجاج لمراكز بديلة.` :
            getAlertLevel(center.occupancy) === 'medium' ? `تنبيه: ${center.name} يقترب من السعة القصوى (${center.occupancy}%). يرجى الحذر.` :
            `${center.name} يعمل بشكل طبيعي (${center.occupancy}%).`
          }</p>
        </div>
      ))}

      {/* تنبيهات المرحلة */}
      <div className={`p-4 rounded-lg ${
        getAlertLevel(stageOccupancy) === 'high' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
        getAlertLevel(stageOccupancy) === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
        'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
      }`}>
        <h4 className="font-medium mb-2">حالة المرحلة</h4>
        <p>{
          getAlertLevel(stageOccupancy) === 'high' ? 'تنبيه: المرحلة مزدحمة جداً. يجب إعادة توزيع الحجاج.' :
          getAlertLevel(stageOccupancy) === 'medium' ? 'تنبيه: المرحلة تقترب من الحد الأقصى. يرجى المراقبة.' :
          'المرحلة تعمل بشكل طبيعي.'
        }</p>
      </div>

      {/* توصيات عامة */}
      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
        <h4 className="font-medium text-primary-700 dark:text-primary-400 mb-2">
          توصيات عامة
        </h4>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
          {centersStatus.some(c => getAlertLevel(c.occupancy) === 'high') && (
            <li>فتح مسارات إضافية لتخفيف الازدحام في المراكز المزدحمة</li>
          )}
          {getAlertLevel(stageOccupancy) === 'high' && (
            <li>تنسيق مع المراحل الأخرى لإعادة التوزيع</li>
          )}
          <li>متابعة معدلات الدخول والخروج</li>
          <li>التأكد من جاهزية جميع المرافق</li>
        </ul>
      </div>
    </div>
  );
} 