import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 32px rgba(139, 92, 246, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
