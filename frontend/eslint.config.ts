import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  {
    name: 'app/overrides',
    rules: {
      // _ prefix is the TypeScript community convention for intentionally unused
      // destructuring targets (e.g. omitting a field via rest spread).
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  {
    name: 'app/architecture-rules',
    files: ['src/views/**/*.vue', 'src/views/**/*.ts', 'src/features/**/*.vue', 'src/features/**/*.ts'],
    rules: {
      // Prevent direct framework7-vue imports in views and features
      'no-restricted-imports': ['error', {
        name: 'framework7-vue',
        message: 'Direct framework7-vue imports are not allowed in views/features. Use semantic wrappers from @/design/semantic instead.',
      }],
    },
  },

  skipFormatting,
)
