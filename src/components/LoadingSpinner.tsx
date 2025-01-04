export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
      <span className="mr-3 text-gray-600 dark:text-gray-400">جاري التحميل...</span>
    </div>
  );
} 