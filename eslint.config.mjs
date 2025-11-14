// eslint.config.js (또는 .mjs)
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // ✅ 전역 ignore: Flat Config에서는 여기에 반드시 포함해야 함
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // ⬇⬇ 추가: 생성 산출물 폴더 전부 무시
      "src/generated/**",
      "src/generated/prisma/**",
    ],
  },

  // next/core-web-vitals, next/typescript 등 기존 확장
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // (선택) 혹시 일부 생성물만 린트하되 경고를 끄고 싶다면 별도 override 추가 가능:
  // {
  //   files: ["src/generated/**", "src/generated/prisma/**"],
  //   rules: {
  //     "@typescript-eslint/no-unused-expressions": "off",
  //     "@typescript-eslint/no-unused-vars": "off",
  //     "@typescript-eslint/no-require-imports": "off"
  //   }
  // }
];

export default eslintConfig;
