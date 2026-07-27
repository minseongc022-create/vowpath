/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d9d9de",
          300: "#b8b8c1",
          400: "#91919f",
          500: "#737384",
          600: "#5d5d6b",
          700: "#4c4c57",
          800: "#41414a",
          900: "#393941",
          950: "#0a0a0b",
        },
        chrome: {
          DEFAULT: "#c8c8d0",
          bright: "#f0f0f4",
          dim: "#8a8a96",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "chrome-shine":
          "linear-gradient(135deg, #0a0a0b 0%, #1a1a1e 40%, #3a3a44 50%, #1a1a1e 60%, #0a0a0b 100%)",
        "metal-line":
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
        "spot-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.12), transparent)",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(255,255,255,0.15)",
        panel: "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 50px -20px rgba(0,0,0,0.8)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        shimmer: "shimmer 6s linear infinite",
        rise: "rise 0.7s ease-out both",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
