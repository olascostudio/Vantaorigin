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
        // Creator Studio, measured from the mockup canvas. Warm paper and a
        // purple primary, deliberately its own light world: a creator works
        // in here, and the dark marketing site is not a working surface.
        studio: {
          paper: "#f4f4f0",
          card: "#ffffff",
          line: "#e5e3dc",
          ink: "#1c1a17",
          body: "#3d3933",
          muted: "#6b6459",
          edge: "#908a7e", // the only border dark enough for a control
          brand: "#6a28a8",
          "brand-dark": "#51207f",
          "brand-soft": "#f1ebf8", // the active nav item
          shelf: "#efece4", // a cover with no artwork yet
          warn: "#92400e",
          info: "#1d4ed8",
          good: "#15803d",
        },
      },
      fontFamily: {
        display: ["'Spicy Rice'", "cursive"],
        body: ["'Comic Neue'", "sans-serif"],
        ui: ["Inter", "sans-serif"],
        pill: ["'Instrument Sans'", "Inter", "sans-serif"],
        studio: ["'Bricolage Grotesque'", "Inter", "sans-serif"], // Studio display
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
        // A card arriving in its slot, as if dealt into it. Slides in
        // from the right and settles. The cards carry their tilt as an
        // inline transform on a wrapper above this, so animating the
        // artwork itself leaves the tilt alone.
        deal: {
          "0%": { opacity: "0", transform: "translateX(26%) scale(1.04)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
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
        deal: "deal 620ms cubic-bezier(0.22, 1, 0.36, 1) both",
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
