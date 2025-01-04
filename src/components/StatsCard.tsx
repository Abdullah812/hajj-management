interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
  trend?: {
    value: string;
    label: string;
    type: 'increase' | 'decrease';
  };
}

export function StatsCard({ title, value, icon, loading = false }: StatsCardProps) {
  return (
    <div className="card">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="rounded-md bg-primary-50 p-3">
            {icon}
          </div>
        </div>
        <div className="mr-5">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  )
} 