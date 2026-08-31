/** @type {import('tailwindcss').Config} */
// Telegram Theme ranglari CSS o'zgaruvchilaridan olinadi (index.css da berilgan).
// Shu struktura Telegram'ning light/dark ranglariga avtomatik moslashadi.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--tg-base)",
        deep: "var(--tg-deep)",
        surface: "var(--tg-surface)",
        card: "var(--tg-card)",
        border: "var(--tg-border)",
        text: "var(--tg-text)",
        muted: "var(--tg-muted)",
        accent: "var(--tg-accent)",
        soft: "var(--tg-soft)",
        income: "#34d399",
        expense: "#fb7185",
      },
      borderRadius: {
        "3xl": "1.25rem",
        "4xl": "1.75rem",
      },
      boxShadow: {
        glass: "0 10px 40px -12px rgba(15, 23, 42, 0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        shimmer: "shimmer 1.3s infinite",
      },
    },
  },
  plugins: [],
};