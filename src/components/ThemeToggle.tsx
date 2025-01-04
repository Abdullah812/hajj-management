import { useState, useEffect } from 'react'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true)
    }
  }, [])

  function toggleTheme() {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
      setIsDark(true)
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-full transition-all duration-500 
        hover:scale-110 hover:shadow-lg
        ${isDark 
          ? 'bg-gray-800 hover:bg-gray-700 hover:shadow-primary-500/20' 
          : 'bg-primary-100 hover:bg-primary-200 hover:shadow-primary-600/20'
        } ${className}`}
    >
      <div className="relative w-6 h-6 transform-gpu transition-transform duration-300">
        <span
          className={`absolute inset-0 transform transition-all duration-500
            ${isDark 
              ? 'rotate-0 opacity-100 scale-100' 
              : '-rotate-90 opacity-0 scale-75'}`}
        >
          <MoonIcon className="w-6 h-6 text-primary-400 filter drop-shadow" />
        </span>
        <span
          className={`absolute inset-0 transform transition-all duration-500
            ${isDark 
              ? 'rotate-90 opacity-0 scale-75' 
              : 'rotate-0 opacity-100 scale-100'}`}
        >
          <SunIcon className="w-6 h-6 text-primary-600 filter drop-shadow" />
        </span>
      </div>
    </button>
  )
} 