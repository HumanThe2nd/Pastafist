/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ink: "#102019",
        forest: "#0f2a1b",
        leaf: "#1b7f54",
        citrus: "#f6a437",
        sand: "#f3f7f2",
        clay: "#e7dfd2",
        berry: "#e76a5a",
        mist: "#eff6f0"
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Space Grotesk", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 70px -55px rgba(15, 23, 42, 0.45)",
        card: "0 22px 60px -50px rgba(15, 23, 42, 0.4)"
      },
      backgroundImage: {
        hero: "radial-gradient(circle at 12% 6%, rgba(140, 217, 181, 0.35), transparent 42%), radial-gradient(circle at 75% 12%, rgba(255, 224, 153, 0.3), transparent 45%), radial-gradient(circle at 20% 90%, rgba(255, 170, 152, 0.2), transparent 50%)"
      }
    }
  },
  plugins: []
};
