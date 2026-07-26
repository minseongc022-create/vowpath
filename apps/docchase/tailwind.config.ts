import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0e1a18",
          soft: "#1c2e2a",
          muted: "#3d524c",
        },
        paper: {
          DEFAULT: "#f3f5f1",
          card: "#fafbf8",
          line: "#d8e0da",
        },
        pine: {
          50: "#eef7f4",
          100: "#d5ebe3",
          200: "#aed7c8",
          500: "#1f7a66",
          600: "#186455",
          700: "#145245",
          800: "#114239",
        },
        amber: {
          soft: "#fef3c7",
          ink: "#92400e",
        },
        rose: {
          soft: "#ffe4e6",
          ink: "#9f1239",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(14, 26, 24, 0.45)",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(31,122,102,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 0%, rgba(146,64,14,0.08), transparent 50%), linear-gradient(165deg, #eef3ef 0%, #f7f8f4 45%, #e8efe9 100%)",
        "grid-faint":
          "linear-gradient(rgba(14,26,24,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,26,24,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.85)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        rise: "rise 0.7s ease-out both",
        "rise-delay": "rise 0.7s ease-out 0.12s both",
        "rise-delay-2": "rise 0.7s ease-out 0.24s both",
        "pulse-dot": "pulseDot 1.8s ease-in-out infinite",
        "slide-in": "slideIn 0.45s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
