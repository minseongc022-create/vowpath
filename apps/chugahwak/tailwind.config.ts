import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12151a",
          soft: "#1e2430",
          muted: "#5a6472",
        },
        paper: {
          DEFAULT: "#f0f1f3",
          card: "#fafafb",
          line: "#d7dbe2",
        },
        signal: {
          DEFAULT: "#e8b923",
          soft: "#fef6d4",
          ink: "#7a5a00",
        },
        steel: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#2f6fed",
          600: "#2459c9",
          700: "#1d48a3",
          800: "#183a82",
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
        soft: "0 18px 50px -28px rgba(18, 21, 26, 0.5)",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(ellipse 70% 55% at 15% 5%, rgba(47,111,237,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(232,185,35,0.12), transparent 50%), linear-gradient(165deg, #e8ebf0 0%, #f2f3f5 50%, #e4e7ec 100%)",
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
