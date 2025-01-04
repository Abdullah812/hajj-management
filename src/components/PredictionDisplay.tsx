interface PredictionDisplayProps {
  prediction: string;
  distribution: string;
}

export function PredictionDisplay({ prediction, distribution }: PredictionDisplayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* عرض التنبؤ */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-4">
          التنبؤ بالازدحام
        </h3>
        <div className="space-y-2">
          {prediction.split('\n').map((line, index) => (
            <p 
              key={index} 
              className={`${
                line.startsWith('تحذير') 
                  ? 'text-red-600 dark:text-red-400 font-semibold' 
                  : line.startsWith('تنبيه')
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : line.startsWith('•')
                  ? 'text-gray-600 dark:text-gray-400 mr-4'
                  : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* عرض التوزيع المقترح */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-4">
          التوزيع الأمثل
        </h3>
        <div className="text-gray-800 dark:text-gray-200">
          {distribution}
        </div>
      </div>
    </div>
  );
} 