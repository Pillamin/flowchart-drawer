/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nanum Square Round"', 'sans-serif'],
      },
      colors: {
        // Background
        canvas: '#F8FAFC',
        grid: '#E2E8F0',
        // Text
        'text-primary': '#1E293B',
        'text-placeholder': '#94A3B8',
        // Node: Terminal (시작/끝)
        'terminal-bg': '#D1FAE5',
        'terminal-border': '#10B981',
        // Node: IO (입출력)
        'io-bg': '#FEF08A',
        'io-border': '#EAB308',
        // Node: Process (처리)
        'process-bg': '#BAE6FD',
        'process-border': '#0EA5E9',
        // Node: Decision (판단)
        'decision-bg': '#E9D5FF',
        'decision-border': '#A855F7',
        // Accent
        'flow-line': '#64748B',
        selected: '#3B82F6',
        error: '#FCA5A5',
        // Sidebar
        sidebar: '#FFFFFF',
        // Simulation
        'sim-active': '#FBBF24',
        'sim-visited': '#86EFAC',
      },
      boxShadow: {
        sidebar: '2px 0 8px rgba(0,0,0,0.05)',
        node: '0 2px 8px rgba(0,0,0,0.08)',
        'node-selected': '0 0 0 2px #3B82F6, 0 4px 12px rgba(59,130,246,0.2)',
      },
    },
  },
  plugins: [],
}
