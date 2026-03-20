/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#0A0F1E",
        "shell-2": "#111827",
        "shell-3": "#1E293B",
        primary: "#1D4ED8",
        "primary-foreground": "#EFF6FF",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        surface: "#FFFFFF",
        "surface-alt": "#F8FAFC",
        "surface-soft": "#EEF4FF",
        border: "#E2E8F0",
        text: "#0F172A",
        "text-soft": "#475569",
        "text-muted": "#64748B"
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        shell: "0 24px 60px rgba(15, 23, 42, 0.24)",
        card: "0 12px 30px rgba(15, 23, 42, 0.08)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    },
  },
  plugins: [],
}
