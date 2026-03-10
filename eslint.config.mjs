import coreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
  },
  ...coreWebVitals,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

export default eslintConfig;
