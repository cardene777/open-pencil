import { defineConfig } from 'drizzle-kit'
import { fileURLToPath } from 'node:url'

const DEFAULT_INKLY_API_DB_PATH = fileURLToPath(
  new URL('../../.context/api-data/inkly.db', import.meta.url)
)

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.INKLY_API_DB_PATH?.trim() || DEFAULT_INKLY_API_DB_PATH
  }
})
