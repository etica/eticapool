/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'jetbrains': ['"JetBrains Mono"', 'monospace'],
        'fira': ['"Fira Code"', 'monospace'],
        'inter': ['Inter', 'sans-serif'],
        'source-code': ['"Source Code Pro"', 'monospace'],
        'ibm-mono': ['"IBM Plex Mono"', 'monospace'],
        'ibm-sans': ['"IBM Plex Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
