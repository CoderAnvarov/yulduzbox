/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        navy: {
          400: "#7A8AA8",
          500: "#475A7A",
          700: "#1E2A4A",
          900: "#0F1830",
        },
        ok: { bg: "#DCFCE7", fg: "#166534" },
        warn: { bg: "#FEF3C7", fg: "#92400E" },
        bad: { bg: "#FEE2E2", fg: "#991B1B" },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
      boxShadow: {
        card: "0 6px 24px -8px rgba(37, 99, 235, 0.18)",
      },
    },
  },
  plugins: [],
};
