import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/bun-sqlite/migrator'

import {
  createApiDatabase,
  resolveApiDatabaseOptions,
  type ApiDatabase,
  type ApiDatabaseOptions
} from './client.js'

export function resolveApiMigrationsFolder() {
  const candidates = [
    fileURLToPath(new URL('./migrations', import.meta.url)),
    fileURLToPath(new URL('../../src/db/migrations', import.meta.url)),
    resolve(process.cwd(), 'packages/api/src/db/migrations')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  throw new Error('Unable to locate API migration folder')
}

export function runApiMigrations(database: ApiDatabase) {
  migrate(database.db, {
    migrationsFolder: resolveApiMigrationsFolder()
  })
}

export function createMigratedApiDatabase(options: ApiDatabaseOptions = {}) {
  const database = createApiDatabase(options)
  runApiMigrations(database)
  return database
}

if (import.meta.main) {
  const database = createApiDatabase(resolveApiDatabaseOptions())

  try {
    runApiMigrations(database)
    console.log(`[inkly-api] migrations applied to ${database.path}`)
  } finally {
    database.close()
  }
}
