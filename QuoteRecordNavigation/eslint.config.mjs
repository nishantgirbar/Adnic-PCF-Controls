import eslintjs from "@eslint/js";
import microsoftPowerApps from "@microsoft/eslint-plugin-power-apps";
import pluginPromise from "eslint-plugin-promise";
import globals from "globals";
import typescriptEslint from "typescript-eslint";

export default [
  { ignores: ["**/generated/", "**/out/"] },
  eslintjs.configs.recommended,
  ...typescriptEslint.configs.recommended,
  pluginPromise.configs["flat/recommended"],
  microsoftPowerApps.configs.paCheckerHosted,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ComponentFramework: true
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off"
    }
  }
];
