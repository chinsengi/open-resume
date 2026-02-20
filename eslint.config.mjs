import coreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  ...coreWebVitals,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      // These rules are new in eslint-config-next 16 and flag pre-existing patterns
      // that were accepted by the previous config (eslint-config-next 13)
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
];
