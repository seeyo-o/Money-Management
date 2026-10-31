/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        slate: {
          primary: '#0F172A',
          secondary: '#64748B',
          border: '#E2E8F0',
          subtle: '#F1F5F9',
        },
        brand: {
          teal: '#0F766E',
          tealDark: '#115E59',
          charcoal: '#1E293B',
        },
        semantic: {
          income: '#10B981',
          incomeBg: '#ECFDF5',
          warning: '#F59E0B',
          warningBg: '#FFFBEB',
          expense: '#F43F5E',
          expenseBg: '#FFF1F2',
          transfer: '#6366F1',
          transferBg: '#EEF2FF',
        },
        wallet: {
          bca: '#0060AF',
          cimb: '#DC2626',
          ovo: '#6D28D9',
          gopay: '#00AED6',
          shopeepay: '#EA580C',
          dana: '#118EEA',
          cash: '#059669',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
        'modal': '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
      }
    },
  },
  plugins: [],
}
