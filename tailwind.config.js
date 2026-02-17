module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular', 'system-ui', 'sans-serif'],
        'sans-medium': ['PlusJakartaSans_500Medium', 'system-ui'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold', 'system-ui'],
        'sans-bold': ['PlusJakartaSans_700Bold', 'system-ui'],
        'sans-extrabold': ['PlusJakartaSans_800ExtraBold', 'system-ui'],
      },
      colors: {
        primary: '#FF9F66',
        'primary-dark': '#e88b52',
        background: '#0c0c0e',
        'background-card': '#16161a',
        'background-card-hover': '#1c1c21',
        'background-secondary': '#222228',
        'background-surface': '#1e1e24',
        text: '#fafafa',
        'text-secondary': '#9898a0',
        'text-muted': '#6b6b73',
        border: '#2a2a30',
        'border-soft': '#25252b',
        success: '#22c55e',
        error: '#ef4444',
      },
      borderRadius: {
        '2.5xl': 20,
        '3xl': 24,
      },
    },
  },
  plugins: [],
};
