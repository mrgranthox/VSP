/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#0F172A",
        "shell-2": "#1E293B",
        "shell-3": "#334155",
        primary: "#0284C7",
        "primary-foreground": "#FFFFFF",
        success: "#059669",
        warning: "#D97706",
        danger: "#DC2626",
        surface: "#FFFFFF",
        "surface-alt": "#F8FAFC",
        "surface-soft": "#F1F5F9",
        border: "#E2E8F0",
        text: "#0F172A",
        "text-soft": "#334155",
        "text-muted": "#64748B"
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        shell: "0 20px 45px rgba(15, 23, 42, 0.12)",
        card: "0 4px 20px rgba(15, 23, 42, 0.05)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    },
  },
  plugins: [],
}
