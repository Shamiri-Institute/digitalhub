import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "muted-green": "hsl(var(--muted-green))",
        "muted-yellow": "hsl(var(--muted-yellow))",
        "muted-pink": "hsl(var(--muted-pink))",
        "muted-sky": "hsl(var(--muted-sky))",
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
        },
        "background-secondary": "#F7F7F7",
        "shamiri-blue": "#0474bc", // DEPRECATED: switch shamiri-blue to shamiri-new-blue
        "shamiri-new-blue": "#0085FF",
        "shamiri-blue-darker": "#045e96",
        "shamiri-light-blue": "#b0d5ea",
        "shamiri-dark-blue": "#002244",
        "shamiri-red": "#DE5E68",
        canvas: "hsl(var(--canvas))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "active-card": {
          DEFAULT: "hsl(var(--active-card))",
          foreground: "hsl(var(--active-card-foreground))",
          "foreground-accent": "hsl(var(--active-card-foreground-accent))",
        },
        // From Figma
        grey: "rgba(173, 173, 173, 1)",
        "grey-c3": "rgba(150, 150, 150, 1)", // Light/Grayscale/Content 3
        "grey-border": "rgba(232, 232, 232, 1)", // Light/Grayscale/Border
        "grey-bg": "rgba(252, 252, 252, 1)", // BG/Gray
        "green-border": "rgba(204, 241, 214, 1)", // Light/Green/Border
        "green-bg": "rgba(229, 248, 235, 1)", // Light/Green/Background
        "green-base": "rgba(0, 186, 52, 1)", // Light/Green/Base
        "blue-border": "rgba(204, 231, 255, 1)", // Light/Blue/Border
        "blue-bg": "rgba(229, 243, 255, 1)", // Light/Blue/Background
        "blue-base": "rgba(0, 133, 255, 1)", // Light/Blue/Base
        "red-border": "hsl(359, 85%, 90%)", // Light/Red/Border
        "red-bg": "hsla(0, 100%, 62%, 0.1)", // Light/Red/Background
        "red-base": "hsla(0, 81%, 54%, 1)", // Light/Red/Base
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      zIndex: {
        "100": "100",
      },
      opacity: {
        "3": "0.03",
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
