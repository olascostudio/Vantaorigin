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
        // A slow drift around a small ellipse. Wider than it is tall,
        // because a card that rises and falls as much as it slides reads as
        // bouncing, and these are meant to look like they are floating in
        // place rather than bobbing on water.
        //
        // Translation only. The cards carry their own tilt as an inline
        // transform and a keyframe on the same element would throw it away,
        // so this animates a wrapper and the tilt stays underneath.
        drift: {
          "0%, 100%": { transform: "translate(0px, 0px)" },
          "25%": { transform: "translate(6px, -4px)" },
          "50%": { transform: "translate(0px, -7px)" },
          "75%": { transform: "translate(-6px, -4px)" },
        },
        // Content arriving: up a little, and in. Eight pixels, because
        // anything further reads as the page still loading.
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // For a bar that fills to show how far along something is.
        grow: {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        marquee: "marquee 60s linear infinite",
        drift: "drift 9s ease-in-out infinite",
        rise: "rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        grow: "grow 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
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
