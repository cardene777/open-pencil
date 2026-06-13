import { zipSync } from 'fflate'

import type { SiteExportFile } from './export'

export function zipSiteExportFiles(files: SiteExportFile[]): Uint8Array {
  const entries = Object.fromEntries(
    files.map((file) => [
      file.path,
      typeof file.contents === 'string' ? new TextEncoder().encode(file.contents) : file.contents
    ])
  )

  return zipSync(entries, { level: 0 })
}
