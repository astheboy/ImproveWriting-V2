/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './src/app.html'
  ],
  darkMode: 'class', // 다크모드 클래스 기반
  theme: {
    extend: {
      colors: {
        // 메인 브랜드 컬러
        primary: {
          DEFAULT: '#13a4ec',
          50: '#f0f9ff',
          100: '#e0f3ff',
          200: '#bae8ff',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#13a4ec',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49'
        },
        
        // 백그라운드 컬러
        'background-light': '#f6f7f8',
        'background-dark': '#101c22',
        'background-subtle-light': '#e7eff3',
        'background-subtle-dark': '#1a2a33',
        
        // 텍스트 컬러
        'text-heading-light': '#0d171b',
        'text-heading-dark': '#f6f7f8',
        'text-body-light': '#4c809a',
        'text-body-dark': '#a7bbc7',
        
        // 보더 컬러
        'border-subtle-light': '#cfdfe7',
        'border-subtle-dark': '#24353f',
        
        // 다크모드 호환을 위한 추가 컬러들
        subtle: {
          DEFAULT: '#e7eff3',
          dark: '#1a2a33'
        }
      },
      
      fontFamily: {
        display: ['Noto Sans KR', 'sans-serif'],
        sans: ['Noto Sans KR', 'sans-serif']
      },
      
      borderRadius: {
        DEFAULT: '0.25rem', // 4px
        'sm': '0.125rem',   // 2px
        'md': '0.375rem',   // 6px
        'lg': '0.5rem',     // 8px
        'xl': '0.75rem',    // 12px
        '2xl': '1rem',      // 16px  
        '3xl': '1.5rem',    // 24px
        'full': '9999px'    // 원형
      },
      
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
      },
      
      backdropBlur: {
        xs: '2px',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out'
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      
      minHeight: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'full': '100%',
        'screen': '100vh',
        'dvh': '100dvh'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class'
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries')
  ],
  
  // 커스텀 유틸리티 클래스
  corePlugins: {
    // 필요없는 유틸리티 클래스 비활성화
    container: false
  }
}