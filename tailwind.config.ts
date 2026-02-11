import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "yoh-bg": "#1d293d",
        "yoh-panel": "#2f4366",
        "yoh-accent": "#f6c344",
        "yoh-text": "#f7f9ff"
      },
      keyframes: {
        horseBounce: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        }
      },
      animation: {
        "horse-bounce": "horseBounce 0.9s steps(2, end) infinite"
      }
    }
  },
  plugins: []
};

export default config;
