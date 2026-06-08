import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import './app.css'
import { useAuthStore } from '@/app/auth/store'
import { preloadFonts } from '@/app/editor/fonts'
import { startPerfTraceReporter } from '@/app/perf-trace/reporter'
import { IS_TAURI } from '@/constants'

import App from './App.vue'
import router from './router'

function shouldInitAuth(pathname: string) {
  return pathname === '/boards' || pathname === '/account' || pathname === '/notifications'
}

const LEGACY_PURGE_VERSION_KEY = 'inkly.legacy-client-storage-purge-v1'

async function purgeLegacyClientStorage(): Promise<void> {
  if (typeof indexedDB === 'undefined') return

  // 既存 user が抱える IndexedDB pen-cache / 古い yjs collab cache / SW cache を 1 回だけ消す。
  // localStorage flag で再実行を抑止 (毎起動 SW cache を吹き飛ばさないため)。
  const purged =
    typeof window !== 'undefined' && window.localStorage?.getItem(LEGACY_PURGE_VERSION_KEY)
  if (purged) return

  const legacyDbNames = ['inkly-document-cache']
  try {
    const factoryWithDatabases = indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string }>>
    }
    if (typeof factoryWithDatabases.databases === 'function') {
      const all = await factoryWithDatabases.databases()
      for (const info of all) {
        if (info?.name && info.name.startsWith('op-room-')) legacyDbNames.push(info.name)
      }
    }
  } catch {
    // databases() not supported (older browsers) — fall through with the known list.
  }

  await Promise.all(
    legacyDbNames.map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const req = indexedDB.deleteDatabase(name)
            req.onsuccess = () => resolve()
            req.onerror = () => resolve()
            req.onblocked = () => resolve()
          } catch {
            resolve()
          }
        })
    )
  )

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    } catch {
      // ignore
    }
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined') {
    window.localStorage?.setItem(LEGACY_PURGE_VERSION_KEY, '1')
  }
}

await purgeLegacyClientStorage()

preloadFonts()
startPerfTraceReporter()
const head = createHead()
const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(head)

if (typeof window !== 'undefined' && shouldInitAuth(window.location.pathname)) {
  void useAuthStore(pinia).init()
}

app.mount('#app')

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
