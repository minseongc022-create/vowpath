import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14181f",
          soft: "#222933",
          muted: "#5c6674",
        },
        paper: {
          DEFAULT: "#e8eaee",
          card: "#f7f8fa",
          line: "#d0d5dd",
        },
        signal: {
          DEFAULT: "#d4a017",
          soft: "#f7efd4",
          ink: "#6b5200",
        },
        steel: {
          50: "#eef3f8",
          100: "#d6e2ee",
          500: "#3a5f7a",
          600: "#2f4f66",
          700: "#253f52",
          800: "#1c3140",
        },
        rose: {
          soft: "#ffe4e6",
          ink: "#9f1239",
        },
        pine: {
          50: "#eef7f4",
          100: "#d5ebe3",
          700: "#145245",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "var(--font-sans-fallback)",
          "system-ui",
          "sans-serif",
        ],
        display: ["var(--font-display)", "Noto Serif KR", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(20, 24, 31, 0.5)",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(ellipse 65% 50% at 12% 0%, rgba(58,95,122,0.16), transparent 55%), radial-gradient(ellipse 45% 35% at 92% 8%, rgba(212,160,23,0.11), transparent 50%), linear-gradient(168deg, #dfe3e9 0%, #e9ebef 48%, #d8dde5 100%)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.65s ease-out both",
        "rise-delay": "rise 0.65s ease-out 0.1s both",
        "rise-delay-2": "rise 0.65s ease-out 0.2s both",
      },
    },
  },
  plugins: [],
};

export default config;
