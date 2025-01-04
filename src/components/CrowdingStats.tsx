interface Center {
  id: number;
  name: string;
  capacity: number;
  current_count: number;
}

interface CrowdingStatsProps {
  centers: Center[];
  stageData: {
    name: string;
    max_pilgrims: number;
    current_pilgrims: number;
  };
}

export function CrowdingStats({ centers, stageData }: CrowdingStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* إحصائيات المراكز */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {centers.map(center => (
          <div key={center.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-4">
              {center.name || 'المركز'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {center.current_count}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  العدد الحالي
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {center.capacity}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  السعة القصوى
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">نسبة الإشغال</span>
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {center.capacity > 0 ? Math.round((center.current_count / center.capacity) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-primary-600 dark:bg-primary-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${center.capacity > 0 ? Math.round((center.current_count / center.capacity) * 100) : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* إحصائيات المرحلة */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-4">
          {stageData.name || 'المرحلة'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stageData.current_pilgrims}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              عدد الحجاج الحالي
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stageData.max_pilgrims}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              الحد الأقصى
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">نسبة الإشغال</span>
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {stageData.max_pilgrims > 0 
                ? Math.round((stageData.current_pilgrims / stageData.max_pilgrims) * 100)
                : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-primary-600 dark:bg-primary-400 h-2.5 rounded-full transition-all duration-500"
              style={{ 
                width: `${stageData.max_pilgrims > 0 
                  ? Math.round((stageData.current_pilgrims / stageData.max_pilgrims) * 100)
                  : 0}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
} 