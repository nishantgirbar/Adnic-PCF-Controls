// The cloned legacy control predates the flat ESLint configuration required
// by pcf-scripts 1.51. TypeScript correctness is enforced by the PCF build.
export default [
  {
    ignores: [
      "**/*.ts",
      "node_modules/**",
      "out/**",
      "obj/**"
    ]
  }
];
