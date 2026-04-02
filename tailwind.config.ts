import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-deep": "var(--color-primary-deep)",
        "primary-light": "var(--color-primary-light)",
        ink: "var(--color-ink)",
        faint: "var(--color-faint)",
        text: "var(--color-text)",
        secondary: "var(--color-secondary)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        card: "var(--color-card)",
        bg: "var(--color-bg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
