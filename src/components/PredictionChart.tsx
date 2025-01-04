import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PredictionChartProps {
  centers: Array<{
    id: number;
    name: string;
    capacity: number;
    current_count: number;
  }>;
}

export function PredictionChart({ centers }: PredictionChartProps) {
  const hours = ['8:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  
  const data = {
    labels: hours,
    datasets: centers.map(center => ({
      label: center.name,
      data: hours.map(() => {
        // هنا يمكن إضافة منطق التنبؤ الحقيقي
        const randomFactor = 0.8 + Math.random() * 0.4; // للتوضيح فقط
        return Math.round(center.current_count * randomFactor);
      }),
      borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
      tension: 0.4,
      fill: false
    }))
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'التنبؤ بأعداد الحجاج خلال اليوم'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'عدد الحجاج'
        }
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <Line data={data} options={options} />
    </div>
  );
} 