import { FC } from 'react';
import { getAppVersion } from '../utils/version';

const Footer: FC = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-inner">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-3">
          <p className="text-gray-600 dark:text-gray-300 font-medium tracking-wide">
            © {new Date().getFullYear()} نظام إدارة النقل العام و الترددي
          </p>
          <p className="text-sm bg-white dark:bg-gray-700 px-4 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
            الإصدار: {getAppVersion()}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 