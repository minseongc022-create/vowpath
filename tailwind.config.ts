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
          50: "#eef7fc",
          100: "#d6ecfa",
          200: "#a8d8f4",
          300: "#6bbee9",
          400: "#2a9fd9",
          500: "#0a84c7",
          600: "#006db3",
          700: "#005691",
          800: "#004275",
          900: "#002849",
          950: "#001428",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f2f8fc",
          elevated: "#ffffff",
          border: "#c5d9e8",
          dark: "#001428",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 36 73 / 0.04), 0 4px 12px -2px rgb(0 36 73 / 0.08)",
        "card-hover":
          "0 8px 24px -4px rgb(0 36 73 / 0.12), 0 4px 8px -4px rgb(0 36 73 / 0.06)",
        nav: "0 1px 0 0 rgb(0 36 73 / 0.08)",
        glow: "0 0 48px -8px rgb(10 132 199 / 0.45)",
        "inner-glow": "inset 0 1px 0 0 rgb(255 255 255 / 0.12)",
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
        "hvac-gradient": "linear-gradient(135deg, #001428 0%, #004275 45%, #006db3 100%)",
        "hvac-cta": "linear-gradient(135deg, #002849 0%, #005691 50%, #0a84c7 100%)",
        "hvac-button": "linear-gradient(135deg, #005691 0%, #0a84c7 100%)",
        "hvac-airflow":
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230a84c7' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
