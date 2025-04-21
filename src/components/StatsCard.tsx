interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading?: boolean;
}

export function StatsCard({ title, value, icon, loading }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mt-1" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {value.toLocaleString('ar-SA')}
            </p>
          )}
        </div>
        <div className="bg-primary-50 rounded-full p-3">
          {icon}
        </div>
      </div>
    </div>
  )
} 