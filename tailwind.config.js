/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Plantin', 'Georgia', 'serif'],
        sans: ['Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      colors: {
        primary: '#000000',
        secondary: '#FFFFFF',
        accent: '#1a1a1a',
        light: '#F5F5F5',
        muted: '#808080',
        gold: '#D4AF37',
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', fontWeight: '400' }],
        'heading': ['2.5rem', { lineHeight: '1.2', fontWeight: '400' }],
        'subheading': ['1.75rem', { lineHeight: '1.3', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        'gutter': '2rem',
        'column': '3rem',
      },
    },
  },
  plugins: [],
};
