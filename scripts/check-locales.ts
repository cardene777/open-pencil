#!/usr/bin/env bun
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'

const MESSAGES_PATH = 'packages/vue/src/i18n/messages.ts'
const LOCALES_DIR = 'packages/vue/src/locales'

interface NamespaceKeys {
  namespace: string
  paths: Set<string>
}

/**
 * Walk an ObjectLiteralExpression and collect every leaf key as a dot path.
 * Nested objects expand to `parent.child`, while function calls (params(...))
 * and string literals are leaf nodes.
 */
function collectKeysFromObject(
  node: ts.ObjectLiteralExpression,
  prefix: string,
  out: Set<string>
) {
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    let name: string | undefined
    if (ts.isIdentifier(prop.name)) name = prop.name.text
    else if (ts.isStringLiteral(prop.name)) name = prop.name.text

    if (!name) continue
    const path = prefix ? `${prefix}.${name}` : name

    if (ts.isObjectLiteralExpression(prop.initializer)) {
      collectKeysFromObject(prop.initializer, path, out)
    } else {
      out.add(path)
    }
  }
}

function extractI18nNamespaces(content: string): NamespaceKeys[] {
  const source = ts.createSourceFile(MESSAGES_PATH, content, ts.ScriptTarget.Latest, true)
  const namespaces: NamespaceKeys[] = []

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'i18n' &&
      node.arguments.length >= 2
    ) {
      const nsArg = node.arguments[0]
      const bodyArg = node.arguments[1]
      if (ts.isStringLiteral(nsArg) && ts.isObjectLiteralExpression(bodyArg)) {
        const paths = new Set<string>()
        collectKeysFromObject(bodyArg, '', paths)
        namespaces.push({ namespace: nsArg.text, paths })
        return
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return namespaces
}

function collectKeysFromLocaleJson(value: unknown, prefix: string, out: Set<string>) {
  if (value === null || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      collectKeysFromLocaleJson(child, path, out)
    } else {
      out.add(path)
    }
  }
}

const content = readFileSync(MESSAGES_PATH, 'utf-8')
const namespaces = extractI18nNamespaces(content)

const localeFiles = readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'))
let hasErrors = false

for (const file of localeFiles) {
  const data = JSON.parse(readFileSync(join(LOCALES_DIR, file), 'utf-8')) as Record<string, unknown>
  const missing: string[] = []
  const extra: string[] = []

  for (const { namespace, paths } of namespaces) {
    const localeNs = data[namespace]
    const localePaths = new Set<string>()
    if (localeNs && typeof localeNs === 'object') {
      collectKeysFromLocaleJson(localeNs, '', localePaths)
    }
    for (const path of paths) {
      if (!localePaths.has(path)) missing.push(`${namespace}.${path}`)
    }
    for (const path of localePaths) {
      if (!paths.has(path)) extra.push(`${namespace}.${path}`)
    }
  }

  if (missing.length > 0 || extra.length > 0) {
    hasErrors = true
    console.error(`\n${file}:`)
    for (const m of missing) console.error(`  missing: ${m}`)
    for (const e of extra) console.error(`  extra:   ${e}`)
  }
}

if (hasErrors) {
  console.error('\nLocale files are out of sync with messages.ts')
  process.exit(1)
} else {
  console.log('All locale files are in sync.')
}
