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
