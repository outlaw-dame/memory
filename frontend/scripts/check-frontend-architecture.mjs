#!/usr/bin/env node

/**
 * Frontend Architecture Check Script
 * 
 * This script enforces the architecture contract defined in:
 * docs/internal/frontend-architecture-contract.md
 * 
 * It checks for:
 * - Konsta UI imports (forbidden everywhere)
 * - Raw Framework7 imports outside design/semantic/
 * - Raw Capacitor imports outside platform/
 * - Raw Iconoir imports outside design/icons/ and AppIcon.vue
 * 
 * Usage:
 *   bun run check:frontend-architecture
 *   node scripts/check-frontend-architecture.mjs
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Colors for output
const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
}

// Configuration
const CONFIG = {
  // Root directory of the frontend
  rootDir: fileURLToPath(new URL('../..', import.meta.url)),
  
  // Directories to check
  checkDirs: [
    'frontend/src',
  ],
  
  // Directories to ignore
  ignoreDirs: [
    'node_modules',
    'dist',
    'dist-ssr',
    'coverage',
    '.git',
  ],
  
  // File extensions to check
  extensions: ['.ts', '.vue', '.js', '.mjs', '.cjs'],
  
  // Forbidden imports
  forbidden: {
    konsta: [
      { pattern: /import.*['"]konsta['"]/, message: 'Konsta UI is forbidden' },
      { pattern: /import.*['"]konsta\/vue['"]/, message: 'Konsta UI is forbidden' },
      { pattern: /from['"]\s*konsta['"]/, message: 'Konsta UI is forbidden' },
      { pattern: /from['"]\s*konsta\/vue['"]/, message: 'Konsta UI is forbidden' },
    ],
  },
  
  // Restricted imports (allowed only in specific directories)
  restricted: [
    {
      name: 'framework7-vue',
      patterns: [
        /import.*['"]framework7-vue['"]/,
        /from['"]\s*framework7-vue['"]/,
      ],
      allowedDirs: ['frontend/src/design/semantic', 'frontend/src/main.ts'],
      message: 'Direct framework7-vue imports are only allowed in frontend/src/design/semantic/ and frontend/src/main.ts'
    },
    {
      name: '@capacitor',
      patterns: [
        /import.*['"]@capacitor\//,
        /from['"]\s*@capacitor\//,
      ],
      allowedDirs: ['frontend/src/platform'],
      message: 'Direct @capacitor imports are only allowed in frontend/src/platform/'
    },
    {
      name: '@iconoir/vue',
      patterns: [
        /import.*['"]@iconoir\/vue['"]/,
        /from['"]\s*@iconoir\/vue['"]/,
      ],
      allowedDirs: ['frontend/src/design/icons', 'frontend/src/components'],
      message: 'Direct @iconoir/vue imports are only allowed in frontend/src/design/icons/ and frontend/src/components/AppIcon.vue'
    },
    {
      name: '@iconoir/core',
      patterns: [
        /import.*['"]@iconoir\/core['"]/,
        /from['"]\s*@iconoir\/core['"]/,
      ],
      allowedDirs: ['frontend/src/design/icons', 'frontend/src/components'],
      message: 'Direct @iconoir/core imports are only allowed in frontend/src/design/icons/ and frontend/src/components/AppIcon.vue'
    },
  ],
}

// State
let violations = []
let filesChecked = 0
let filesPassed = 0

/**
 * Check if a file path should be ignored
 */
function shouldIgnore(filePath) {
  for (const dir of CONFIG.ignoreDirs) {
    if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) {
      return true
    }
  }
  return false
}

/**
 * Check if a file path is in an allowed directory
 */
function isInAllowedDir(filePath, allowedDirs) {
  for (const allowedDir of allowedDirs) {
    const normalizedAllowed = allowedDir.replace(/\//g, '/')
    const normalizedFilePath = filePath.replace(/\//g, '/')
    
    // Check if the file path contains the allowed directory
    // This handles both absolute paths and relative paths
    if (normalizedFilePath.includes(`/${normalizedAllowed}/`) || 
        normalizedFilePath.includes(`\\${normalizedAllowed}\\`) ||
        normalizedFilePath.endsWith(`/${normalizedAllowed}`) ||
        normalizedFilePath.endsWith(`\\${normalizedAllowed}`)) {
      return true
    }
  }
  return false
}

/**
 * Check file content for violations
 */
async function checkFile(filePath, relativePath) {
  filesChecked++
  
  try {
    const content = await readFile(filePath, 'utf-8')
    
    // Check for forbidden imports
    for (const [name, checks] of Object.entries(CONFIG.forbidden)) {
      for (const { pattern, message } of checks) {
        if (pattern.test(content)) {
          violations.push({
            file: relativePath,
            type: 'forbidden',
            name,
            message,
          })
          return
        }
      }
    }
    
    // Check for restricted imports
    for (const restriction of CONFIG.restricted) {
      for (const pattern of restriction.patterns) {
        if (pattern.test(content)) {
          // Check if file is in allowed directory
          if (!isInAllowedDir(filePath, restriction.allowedDirs)) {
            violations.push({
              file: relativePath,
              type: 'restricted',
              name: restriction.name,
              message: restriction.message,
            })
            return
          }
          // File is in allowed directory, which is fine
          break
        }
      }
    }
    
    filesPassed++
  } catch (error) {
    console.warn(`${COLORS.yellow}⚠️  Could not read file: ${relativePath}${COLORS.reset}`)
  }
}

/**
 * Recursively walk through directories
 */
async function walkDirectory(dirPath, basePath = CONFIG.rootDir) {
  const entries = await readdir(dirPath, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    const relativePath = relative(basePath, fullPath)
    
    if (shouldIgnore(relativePath)) {
      continue
    }
    
    if (entry.isDirectory()) {
      await walkDirectory(fullPath, basePath)
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase()
      if (CONFIG.extensions.includes(ext)) {
        await checkFile(fullPath, relativePath)
      }
    }
  }
}

/**
 * Format violation message
 */
function formatViolation(violation) {
  const typeColor = violation.type === 'forbidden' ? COLORS.red : COLORS.yellow
  const typeLabel = violation.type === 'forbidden' ? 'FORBIDDEN' : 'RESTRICTED'
  
  return (
    `${COLORS.red}✖${COLORS.reset} ${COLORS.gray}[${typeLabel}]${COLORS.reset} ` +
    `${violation.file}
` +
    `   ${typeColor}→${COLORS.reset} ${violation.message}
`
  )
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n')
  console.log(`${COLORS.blue}═${COLORS.reset}.repeat(80))`)
  console.log(`${COLORS.blue}ARCHITECTURE CHECK SUMMARY${COLORS.reset}`)
  console.log(`${COLORS.blue}═${COLORS.reset}.repeat(80))`)
  console.log(`\nFiles checked: ${filesChecked}`)
  console.log(`Files passed:  ${COLORS.green}${filesPassed}${COLORS.reset}`)
  console.log(`Violations:    ${COLORS.red}${violations.length}${COLORS.reset}`)
  
  if (violations.length === 0) {
    console.log(`\n${COLORS.green}✓ All architecture checks passed!${COLORS.reset}\n`)
    return 0
  } else {
    console.log(`\n${COLORS.red}✗ Architecture violations found.${COLORS.reset}\n`)
    console.log(`${COLORS.gray}Run with --verbose to see all violations.${COLORS.reset}\n`)
    return 1
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${COLORS.cyan}🏗️  Frontend Architecture Check${COLORS.reset}\n`)
  console.log(`${COLORS.gray}Checking import boundaries...${COLORS.reset}\n`)
  
  // Check all configured directories
  for (const dir of CONFIG.checkDirs) {
    const fullPath = join(CONFIG.rootDir, dir)
    try {
      const stats = await stat(fullPath)
      if (stats.isDirectory()) {
        await walkDirectory(fullPath, CONFIG.rootDir)
      }
    } catch (error) {
      console.warn(`${COLORS.yellow}⚠️  Directory not found: ${dir}${COLORS.reset}`)
    }
  }
  
  // Print violations
  if (violations.length > 0) {
    console.log(`\n${COLORS.red}Violations found:${COLORS.reset}\n`)
    for (const violation of violations) {
      console.log(formatViolation(violation))
    }
  }
  
  // Print summary and exit
  const exitCode = printSummary()
  process.exit(exitCode)
}

// Run main
main().catch((error) => {
  console.error(`${COLORS.red}Error running architecture check:${COLORS.reset}`, error)
  process.exit(1)
})
