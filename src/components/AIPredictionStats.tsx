interface StatsProps {
  data: {
    current: number;
    max: number;
    percentage: number;
  };
}

export function PredictionStats({ data }: StatsProps) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
          {data.current}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          العدد الحالي
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
          {data.max}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          السعة القصوى
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
          {data.percentage}%
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          نسبة الإشغال
        </div>
      </div>
    </div>
  );
} 