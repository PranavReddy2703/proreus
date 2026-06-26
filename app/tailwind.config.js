/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#09090B",
        card: "rgba(255, 255, 255, 0.04)",
        cardBorder: "rgba(255, 255, 255, 0.1)",
        primary: "#2DD4BF", // Teal
        success: "#4ADE80", // Green
        warning: "#FBBF24", // Amber
        critical: "#FB7185", // Rose
      },
    },
  },
  plugins: [],
};
