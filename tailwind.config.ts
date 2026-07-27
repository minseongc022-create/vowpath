import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#faf8f5",
          100: "#f5f0e8",
          200: "#ebe3d6",
          300: "#ddd2c0",
          400: "#c9b99e",
          500: "#b59b78",
          600: "#9a7f5e",
          700: "#7d6549",
          800: "#5c4a38",
          900: "#3d3228",
          950: "#2a221c",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f5f0e8",
          elevated: "#ffffff",
          border: "#e8dfd2",
          dark: "#3d3228",
        },
        ping: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        warm: {
          50: "#faf6f1",
          100: "#f0e6d8",
          200: "#dcc9b0",
          300: "#c9ad8a",
          400: "#b8896a",
          500: "#a67c52",
          600: "#8a6342",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(61 50 40 / 0.04), 0 4px 16px -2px rgb(61 50 40 / 0.08)",
        "card-hover":
          "0 12px 32px -6px rgb(61 50 40 / 0.1), 0 6px 12px -6px rgb(61 50 40 / 0.06)",
        elevated:
          "0 2px 4px 0 rgb(61 50 40 / 0.03), 0 8px 24px -4px rgb(61 50 40 / 0.08), 0 0 0 1px rgb(61 50 40 / 0.03)",
        "elevated-hover":
          "0 16px 40px -8px rgb(61 50 40 / 0.12), 0 8px 16px -8px rgb(61 50 40 / 0.08), 0 0 0 1px rgb(61 50 40 / 0.04)",
        nav: "0 1px 0 0 rgb(61 50 40 / 0.05), 0 4px 12px -2px rgb(61 50 40 / 0.05)",
        glow: "0 0 56px -8px rgb(181 155 120 / 0.35), 0 24px 48px -12px rgb(61 50 40 / 0.12)",
        "inner-soft": "inset 0 1px 2px 0 rgb(61 50 40 / 0.04)",
        "inner-glow": "inset 0 1px 0 0 rgb(255 255 255 / 0.8)",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "72rem",
      },
      keyframes: {
        "tour-spotlight": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 4px rgba(6,182,212,0.5), 0 0 20px rgba(6,182,212,0.4)",
            outlineColor: "rgba(6,182,212,0.95)",
            outlineOffset: "4px",
          },
          "50%": {
            boxShadow:
              "0 0 0 12px rgba(6,182,212,0.3), 0 0 40px 16px rgba(6,182,212,0.45)",
            outlineColor: "rgba(6,182,212,0.6)",
            outlineOffset: "9px",
          },
        },
        "tour-ring": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(181,155,120,0.55), 0 0 0 0 rgba(181,155,120,0.25)",
            outlineColor: "rgba(181,155,120,0.9)",
            outlineOffset: "2px",
          },
          "50%": {
            boxShadow: "0 0 0 8px rgba(181,155,120,0.08), 0 0 0 18px rgba(181,155,120,0.03)",
            outlineColor: "rgba(181,155,120,0.45)",
            outlineOffset: "5px",
          },
        },
        "tour-btn-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(154,127,94,0.65)" },
          "50%": { boxShadow: "0 0 0 16px rgba(154,127,94,0)" },
        },
        "tour-slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "tour-spotlight": "tour-spotlight 1.1s ease-in-out infinite",
        "tour-ring": "tour-ring 1.6s ease-in-out infinite",
        "tour-btn-pulse": "tour-btn-pulse 1.3s ease-in-out infinite",
        "tour-slide-up": "tour-slide-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
      },
      backgroundImage: {
        "hvac-gradient":
          "linear-gradient(160deg, #faf8f5 0%, #f5f0e8 45%, #ffffff 100%)",
        "hvac-cta":
          "linear-gradient(135deg, #9a7f5e 0%, #b59b78 58%, #c9ad8a 100%)",
        "hvac-button":
          "linear-gradient(135deg, #8a6342 0%, #b59b78 100%)",
        "vow-brand":
          "linear-gradient(135deg, #b59b78 0%, #9a7f5e 55%, #c9ad8a 100%)",
        "hvac-airflow":
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b59b78' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
