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

  // ============================================================================
  // ARCHITECTURE ENFORCEMENT RULES
  // ============================================================================

  // Block Konsta UI everywhere in the application
  {
    name: 'app/block-konsta',
    files: ['**/*.{ts,vue,js,mjs,cjs}'],
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    rules: {
      'no-restricted-imports': ['error', {
        name: 'konsta',
        message: 'Konsta UI is forbidden. Use Framework7 semantic wrappers from @/design/semantic.',
      }],
      'no-restricted-imports': ['error', {
        name: 'konsta/vue',
        message: 'Konsta UI is forbidden. Use Framework7 semantic wrappers from @/design/semantic.',
      }],
    },
  },

  // Block raw Framework7 imports in views, features, and components
  {
    name: 'app/block-framework7-outside-semantic',
    files: [
      'src/views/**/*.{ts,vue}',
      'src/features/**/*.{ts,vue}',
      'src/components/**/*.{ts,vue}',
      'src/design/components/**/*.{ts,vue}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        name: 'framework7-vue',
        message: 'Direct framework7-vue imports are not allowed here. Use semantic wrappers from @/design/semantic instead.',
      }],
    },
  },

  // Block raw Capacitor imports in views, features, and components
  {
    name: 'app/block-capacitor-outside-platform',
    files: [
      'src/views/**/*.{ts,vue}',
      'src/features/**/*.{ts,vue}',
      'src/components/**/*.{ts,vue}',
      'src/design/**/*.{ts,vue}',
      'src/stores/**/*.{ts,vue}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        name: '@capacitor/core',
        message: 'Direct Capacitor imports are not allowed here. Use platform wrappers from @/platform instead.',
      }],
      'no-restricted-imports': ['error', {
        name: '@capacitor/app',
        message: 'Direct Capacitor imports are not allowed here. Use platform wrappers from @/platform instead.',
      }],
      'no-restricted-imports': ['error', {
        name: '@capacitor/status-bar',
        message: 'Direct Capacitor imports are not allowed here. Use platform wrappers from @/platform instead.',
      }],
      'no-restricted-imports': ['error', {
        name: '@capacitor/',
        message: 'Direct Capacitor imports are not allowed here. Use platform wrappers from @/platform instead.',
      }],
    },
  },

  // Block raw Iconoir imports in views, features, components, and design/components
  {
    name: 'app/block-iconoir-outside-icons',
    files: [
      'src/views/**/*.{ts,vue}',
      'src/features/**/*.{ts,vue}',
      'src/components/**/*.{ts,vue}',
      'src/design/components/**/*.{ts,vue}',
      'src/design/semantic/**/*.{ts,vue}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        name: '@iconoir/vue',
        message: 'Direct Iconoir imports are not allowed here. Use AppIcon component from @/components/AppIcon.vue.',
      }],
      'no-restricted-imports': ['error', {
        name: '@iconoir/core',
        message: 'Direct Iconoir imports are not allowed here. Use AppIcon component from @/components/AppIcon.vue.',
      }],
    },
  },

  // ============================================================================
  // DESIGN/SEMANTIC SPECIFIC RULES
  // ============================================================================

  // Allow Framework7 in design/semantic (this is the ONLY place it should be used)
  {
    name: 'app/allow-framework7-in-semantic',
    files: ['src/design/semantic/**/*.{ts,vue}'],
    rules: {
      // Framework7 is allowed here - this overrides the restriction
      'no-restricted-imports': ['off'],
    },
  },

  // Allow Capacitor in platform layer
  {
    name: 'app/allow-capacitor-in-platform',
    files: ['src/platform/**/*.{ts,vue,js}'],
    rules: {
      // Capacitor is allowed here
      'no-restricted-imports': ['off'],
    },
  },

  // Allow Iconoir in design/icons and AppIcon
  {
    name: 'app/allow-iconoir-in-icons',
    files: [
      'src/design/icons/**/*.{ts,vue}',
      'src/components/AppIcon.vue',
    ],
    rules: {
      // Iconoir is allowed here
      'no-restricted-imports': ['off'],
    },
  },

  skipFormatting,
)
