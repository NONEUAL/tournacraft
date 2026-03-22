/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Tournament brand colors — customize these
        primary:   "#6C63FF",
        secondary: "#1E1E2E",
        surface:   "#2A2A3E",
        accent:    "#00D4AA",
        danger:    "#FF4757",
        win:       "#2ED573",
      },
    },
  },
  plugins: [],
};