import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: ['app', 'ui'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['app', 'ui'],
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      'no-console': 'error',
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            {
              from: 'package',
              package: '@angular/router',
              name: ['navigate', 'navigateByUrl'],
            },
          ],
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@angular-eslint/no-uncalled-signals': 'error',
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
    },
  },
];
