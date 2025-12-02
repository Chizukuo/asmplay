/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 启用手动切换暗黑模式
  safelist: [
    // 背景色
    'bg-black', 'bg-blue-600', 'bg-blue-400', 'bg-green-600', 'bg-green-400',
    'bg-cyan-600', 'bg-cyan-400', 'bg-red-600', 'bg-red-400',
    'bg-purple-600', 'bg-purple-400', 'bg-yellow-700', 'bg-yellow-400',
    'bg-gray-300', 'bg-gray-600', 'bg-white',
    // 文字色
    'text-black', 'text-blue-600', 'text-blue-400', 'text-green-600', 'text-green-400', 'text-green-500',
    'text-cyan-600', 'text-cyan-400', 'text-red-600', 'text-red-400',
    'text-purple-600', 'text-purple-400', 'text-yellow-700', 'text-yellow-400',
    'text-gray-300', 'text-gray-600', 'text-white',
  ],
  theme: {
    extend: {
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
      },
      borderWidth: {
        '3': '3px',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
