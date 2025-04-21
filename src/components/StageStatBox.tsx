interface StageStatBoxProps {
  label: string;
  value: number;
  color?: 'green' | 'blue';
}

export function StageStatBox({ label, value, color }: StageStatBoxProps) {
  return (
    <div className="text-center">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${
        color === 'green' ? 'text-green-600' : 
        color === 'blue' ? 'text-blue-600' : 
        'text-gray-900'
      }`}>
        {value}
      </div>
    </div>
  );
} 