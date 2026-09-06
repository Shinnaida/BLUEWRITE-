// BLUEWRITE — Tailwind CSS Configuration
// Defines the BLUEWRITE design system (navy / police blue palette).

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#030712',
        navy: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        'police-blue': {
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        panel: '#0A1120',
        'panel-raised': '#0F1C33',
        line: '#1E293B',
        'line-bright': '#374151',
        cyan: '#00F0FF',
        'cyan-dim': '#6B7A8C',
        'teal-text': '#00F0FF',
        'green-ok': '#3ED598',
        amber: '#F59E0B',
        'red-error': '#EF4444',
        'red-error-text': '#F87171',
        'red-error-bg': '#450A0A',
        paper: '#FFFFFF',
        steel: '#9CA3AF',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        'display-hud': ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        'mono-hud': ['JetBrains Mono', 'ui-monospace', 'Cascadia Mono', 'Segoe UI Mono', 'Menlo', 'monospace'],
        'body-hud': ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'flash-fill': {
          '0%': { 'background-color': '#FFF7E0', 'border-color': '#F0DFA8' },
          '100%': { 'background-color': 'transparent', 'border-color': '#DBEAFE' },
        },
        'bubble-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'flash-fill': 'flash-fill 1.2s ease-out forwards',
        'bubble-in': 'bubble-in 0.18s ease-out both',
      },
    },
  },
  plugins: [],
};