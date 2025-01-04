import { useState, useEffect } from 'react';
import { aiService } from '../services/AIService';
import { ChartBarIcon, UsersIcon } from '@heroicons/react/24/outline';
import { CrowdingStats } from './CrowdingStats';
import { AlertRecommendations } from './AlertRecommendations';
import { PredictionChart } from './PredictionChart';
import { PredictionDisplay } from './PredictionDisplay';

interface AIPredictionsProps {
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

export function AIPredictions({ centers, stageData }: AIPredictionsProps) {
  const [predictions, setPredictions] = useState({
    crowding: '',
    distribution: '',
    lastUpdated: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchPredictions() {
    setLoading(true);
    setError('');
    try {
      const [crowding, distribution] = await Promise.all([
        aiService.predictCrowding(centers),
        aiService.suggestOptimalDistribution(stageData)
      ]);
      
      setPredictions({
        crowding,
        distribution,
        lastUpdated: new Date().toLocaleTimeString('ar-SA')
      });
    } catch (error) {
      setError('حدث خطأ في جلب التنبؤات');
      console.error('خطأ:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPredictions();
    // تحديث كل 5 دقائق
    const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [centers, stageData]);

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="space-y-6">
        <CrowdingStats centers={centers} stageData={stageData} />
        <PredictionDisplay prediction={predictions.crowding} distribution={predictions.distribution} />
        <AlertRecommendations centers={centers} stageData={stageData} />
        <PredictionChart centers={centers} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">
          التحليل الذكي
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          آخر تحديث: {predictions.lastUpdated}
        </span>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                توقع الازدحام
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {predictions.crowding}
            </p>
          </div>

          <div className="space-y-3 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                التوزيع المقترح
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {predictions.distribution}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={fetchPredictions}
        disabled={loading}
        className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 
          disabled:bg-gray-400 text-white rounded-md transition-colors duration-200"
      >
        {loading ? 'جاري التحليل...' : 'تحديث التحليل'}
      </button>
    </div>
  );
} 