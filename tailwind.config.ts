import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./learn/**/*.{js,ts,jsx,tsx,mdx}",
    "./topik/**/*.{js,ts,jsx,tsx,mdx}",
    "./mano/**/*.{js,ts,jsx,tsx,mdx}",
    "./giu/**/*.{js,ts,jsx,tsx,mdx}",
    "./giu/styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        mano: {
          bg: "#f8faf9",
          surface: "#f0f4f3",
          ink: "#0f172a",
          muted: "#64748b",
          border: "#e2e8f0",
          primary: "#0d9488",
          "primary-hover": "#0f766e",
          accent: "#ea580c",
          "accent-hover": "#c2410c",
        },
        giu: {
          bg: "#f4f7f6",
          surface: "#ffffff",
          ink: "#2d3e4e",
          muted: "#7a8a96",
          border: "#e2e8e6",
          primary: "#2d3e4e",
          "primary-hover": "#223240",
          "primary-soft": "#e8eef2",
          accent: "#6ba894",
          "accent-hover": "#569882",
          "accent-soft": "#e8f4ef",
          mint: "#9dcab8",
          danger: "#d64545",
          gold: "#c4a35a",
        },
        learn: {
          bg: "#f4f6f8",
          surface: "#ffffff",
          muted: "#f0f2f5",
          ink: "#191f28",
          "ink-muted": "#6b7684",
          "ink-subtle": "#adb5bd",
          primary: "#3182f6",
          "primary-hover": "#1b64da",
          accent: "#00c471",
          border: "#e5e8eb",
          sidebar: "#fafbfc",
        },
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
        "learn-sm": "0 1px 3px rgb(25 31 40 / 0.06)",
        "learn-md": "0 4px 20px rgb(25 31 40 / 0.08)",
        "learn-lg": "0 8px 32px rgb(25 31 40 / 0.12)",
        card: "0 1px 2px 0 rgb(61 50 40 / 0.04), 0 4px 16px -2px rgb(61 50 40 / 0.08)",
        "card-hover":
          "0 12px 32px -6px rgb(61 50 40 / 0.1), 0 6px 12px -6px rgb(61 50 40 / 0.06)",
        elevated:
          "0 2px 4px 0 rgb(61 50 40 / 0.03), 0 8px 24px -4px rgb(61 50 40 / 0.08), 0 0 0 1px rgb(61 50 40 / 0.03)",
        "elevated-hover":
          "0 16px 40px -8px rgb(61 50 40 / 0.12), 0 8px 16px -8px rgb(61 50 40 / 0.08), 0 0 0 1px rgb(61 50 40 / 0.04)",
        nav: "0 1px 0 0 rgb(61 50 40 / 0.05), 0 4px 12px -2px rgb(61 50 40 / 0.05)",
        "giu-sm": "0 1px 3px rgb(25 31 40 / 0.06)",
        "giu-md": "0 4px 20px rgb(25 31 40 / 0.08)",
        "giu-nav": "0 -1px 0 0 rgb(229 232 235 / 1), 0 -4px 24px rgb(25 31 40 / 0.06)",
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
