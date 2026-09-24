/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0e0e0e",
        surface: "#3c3c3c", // Figma: black/200
        line: "#1c1c1c", // hero background grid strokes
        subtext: "#acacac",
        primary: "#fc187b", // brand pink/red accent
        secondary: "#9333ea", // brand purple accent
        accent: "#bd7132", // world card author labels
        plum: "#1c1224", // featured creators panel
        "auth-bg": "#111827", // auth screens
      },
      fontFamily: {
        display: ["'Spicy Rice'", "cursive"],
        body: ["'Comic Neue'", "sans-serif"],
        ui: ["Inter", "sans-serif"],
        pill: ["'Instrument Sans'", "Inter", "sans-serif"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "logo-pulse": {
          "0%, 100%": { transform: "scale(0.92)", opacity: "0.75" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
      },
      animation: {
        marquee: "marquee 60s linear infinite",
        // the loading mark: a slow breath, never a spinner
        "logo-pulse": "logo-pulse 1.4s ease-in-out infinite",
      },
      boxShadow: {
        // Offset white block behind the rectangular CTAs (Figma draws it as a
        // separate rectangle 5px left and 5px down).
        block: "-5px 5px 0 0 #ffffff",
        card: "4px 4px 10px 0 rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
