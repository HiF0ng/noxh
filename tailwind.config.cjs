/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './components/**/*.html',
    './assets/js/**/*.js'
  ],
  safelist: [
    'lg:text-[15px]', 'lg:text-[12px]', 'pl-8', 'pr-2', 'lg:px-4',
    'flex', 'items-center', 'gap-2', 'transition-colors', 'text-primary',
    'font-bold', 'text-[15px]', 'hover:bg-surface-container-low',
    'text-error', 'hover:bg-error-container', 'hover:text-error',
    'font-label-md', 'text-label-md', 'text-on-surface', 'font-medium',
    'bg-blue-100', 'text-blue-700', 'bg-green-100', 'text-green-700',
    'bg-purple-100', 'text-purple-700', 'bg-orange-100', 'text-orange-700',
    'bg-pink-100', 'text-pink-700'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', secondary: '#10b981', tertiary: '#f59e0b', neutral: '#64748b',
        'primary-container': '#dbeafe', 'on-primary-container': '#1e40af', 'on-primary': '#ffffff', 'inverse-primary': '#93c5fd',
        'secondary-container': '#d1fae5', 'on-secondary-container': '#065f46', 'on-secondary': '#ffffff',
        'tertiary-container': '#fef3c7', 'on-tertiary-container': '#92400e', 'on-tertiary': '#ffffff',
        background: '#f8fafc', 'on-background': '#0f172a', surface: '#ffffff', 'on-surface': '#0f172a',
        'surface-variant': '#f1f5f9', 'on-surface-variant': '#475569',
        'surface-container-lowest': '#ffffff', 'surface-container-low': '#f8fafc', 'surface-container': '#f1f5f9',
        'surface-container-high': '#e2e8f0', 'surface-container-highest': '#cbd5e1',
        'inverse-surface': '#1e293b', 'inverse-on-surface': '#f8fafc', outline: '#94a3b8', 'outline-variant': '#e2e8f0',
        error: '#ef4444', 'error-container': '#fee2e2', 'on-error': '#ffffff', 'on-error-container': '#991b1b'
      },
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
      spacing: { lg: '40px', 'margin-mobile': '28px', base: '4px', 'max-width': '1280px', 'margin-desktop': 'auto', sm: '16px', xs: '8px', gutter: '24px', md: '24px', xl: '64px' },
      fontFamily: {
        'label-sm': ['Be Vietnam Pro', 'sans-serif'], display: ['Be Vietnam Pro', 'sans-serif'], 'headline-lg-mobile': ['Be Vietnam Pro', 'sans-serif'],
        'body-md': ['Be Vietnam Pro', 'sans-serif'], 'headline-lg': ['Be Vietnam Pro', 'sans-serif'], 'body-lg': ['Be Vietnam Pro', 'sans-serif'],
        'headline-md': ['Be Vietnam Pro', 'sans-serif'], 'label-md': ['Be Vietnam Pro', 'sans-serif']
      },
      fontSize: {
        'label-sm': ['0.6875rem', { lineHeight: '1rem', fontWeight: '500' }], display: ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg-mobile': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }], 'body-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'headline-lg': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '700' }], 'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'headline-md': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }], 'label-md': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '0.01em', fontWeight: '600' }]
      }
    }
  }
};
