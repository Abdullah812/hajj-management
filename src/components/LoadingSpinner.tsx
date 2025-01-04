interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className="flex justify-center items-center p-4">
      <div className={`animate-spin rounded-full border-b-2 border-primary-600 dark:border-primary-400 ${className}`}></div>
    </div>
  );
} 