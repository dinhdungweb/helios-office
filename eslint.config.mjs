// ESLint 9 flat config for the whole monorepo (Next.js 16 removed `next lint`).
// Stays on ESLint 9 because eslint-plugin-react (required by eslint-config-next) does not support ESLint 10 yet.
import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import globals from "globals";
import tseslint from "typescript-eslint";

const scoped = (configs, files) => configs.map((config) => ({ ...config, files }));

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      ".gitnexus/**",
      ".tmp/**",
      ".claude/**",
      "apps/web/next-env.d.ts",
      "apps/api/prisma/migrations/**"
    ]
  },

  // Web: Next.js recommended rules (React, hooks, a11y, Core Web Vitals, TypeScript).
  ...scoped(nextCoreWebVitals, ["apps/web/**/*.{ts,tsx,js,jsx,mjs}"]),
  ...scoped(nextTypescript, ["apps/web/**/*.{ts,tsx}"]),
  {
    files: ["apps/web/**/*.{ts,tsx,js,jsx,mjs}"],
    settings: { next: { rootDir: "apps/web" } }
  },

  // API: plain TypeScript rules for a Node/NestJS service.
  {
    files: ["apps/api/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      // NestJS relies on empty constructors/classes for DI and decorators-only DTOs.
      "@typescript-eslint/no-extraneous-class": "off"
    }
  },

  // Repo scripts.
  {
    files: ["scripts/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node }
  },

  // Existing debt when linting was introduced (2026-10-20), downgraded so CI can start green.
  // `npm run lint` caps the warning count, so the debt cannot grow; restore these to "error"
  // once cleaned up (backlog CORE-26).
  {
    files: ["apps/web/**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "@next/next/no-html-link-for-pages": "warn"
    }
  },
  {
    files: ["apps/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
);
