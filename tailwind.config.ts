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
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
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
        card: "0 1px 2px 0 rgb(0 36 73 / 0.05), 0 4px 16px -2px rgb(0 36 73 / 0.1)",
        "card-hover":
          "0 12px 32px -6px rgb(0 36 73 / 0.14), 0 6px 12px -6px rgb(0 36 73 / 0.08)",
        elevated:
          "0 2px 4px 0 rgb(0 36 73 / 0.04), 0 8px 24px -4px rgb(0 36 73 / 0.12), 0 0 0 1px rgb(0 36 73 / 0.04)",
        "elevated-hover":
          "0 16px 40px -8px rgb(0 36 73 / 0.16), 0 8px 16px -8px rgb(0 36 73 / 0.1), 0 0 0 1px rgb(0 36 73 / 0.05)",
        nav: "0 1px 0 0 rgb(0 36 73 / 0.06), 0 4px 12px -2px rgb(0 36 73 / 0.06)",
        glow: "0 0 56px -8px rgb(10 132 199 / 0.5), 0 24px 48px -12px rgb(0 20 40 / 0.35)",
        "inner-soft": "inset 0 1px 2px 0 rgb(0 36 73 / 0.04)",
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
        "hvac-gradient":
          "linear-gradient(160deg, #0b1220 0%, #111827 45%, #10231f 100%)",
        "hvac-cta":
          "linear-gradient(135deg, #0f766e 0%, #14b8a6 58%, #f59e0b 100%)",
        "hvac-button":
          "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
        "vow-brand":
          "linear-gradient(135deg, #14b8a6 0%, #0f766e 55%, #f59e0b 100%)",
        "hvac-airflow":
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314b8a6' fill-opacity='0.045'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
