/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0f1c",
        panel: "#111827",
        mist: "#9ca3af",
        accent: "#10a37f"
      },
      boxShadow: {
        glow: "0 20px 60px rgba(16, 163, 127, 0.12)"
      }
    }
  },
  plugins: []
};
