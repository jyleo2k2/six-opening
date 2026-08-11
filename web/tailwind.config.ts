import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./features/**/*.{js,ts,jsx,tsx}", "./shared/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#001E5A",
        magenta: "#D70082",
        gray: "#BEBEBE",
        bg: "#F6F7FA",
        white: "#FFFFFF",
        up: "#E8322E",
        down: "#1668DC",
        ink: "#1A2233",
      },
      boxShadow: { card: "0 8px 24px rgb(0 30 90 / 0.08)" },
      fontFamily: { sans: ["Pretendard", "Segoe UI", "Malgun Gothic", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
