/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    // Ensure all your component files, like App.jsx, are covered:
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}