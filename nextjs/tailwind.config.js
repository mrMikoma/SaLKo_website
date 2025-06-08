module.exports = {
  mode: "jit",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        finlandica: ['var(--font-finlandica)'],
        sans: ["Inter var"],
      },
      colors: {
        transparent: "transparent",
        white: "#ffffff",
        black: "#000000",
        swhite: "#f6f4f3",
        sblack: "#0c1821",
        sblued: "#162752",
        sblue: "#0047AA",
        sbluel: "#53a2be",
        sred: "#e84855",
        sgrey: "#e6e6e6",
        swhite: "#f6f4f3",
      },
      backgroundImage: {
        "efsa-one": "url('/images/efsa-one_1.jpg')",
        "ohcon-one": "url('/images/oh-con_1.jpg')",
        "olavinlinna-one": "url('/images/olavinlinna_1.jpg')",
        "punkaharju-one": "url('/images/punkaharju_1.jpg')",
        "savonlinna-one": "url('/images/savonlinna_1.jpg')",
      },
    },
  },
  plugins: [require("@tailwindcss/aspect-ratio")],
};
