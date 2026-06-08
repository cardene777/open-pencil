import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import './app.css'
import { decodeBoardContentBytes, fetchBoardContent } from '@/app/api/client'
import { useAuthStore } from '@/app/auth/store'
import { resolveBoardIdFromLocation, resolveBoardNameFromLocation } from '@/app/boards/location'
import { preloadFonts } from '@/app/editor/fonts'
import { startPerfTraceReporter } from '@/app/perf-trace/reporter'
import { IS_TAURI } from '@/constants'

import App from './App.vue'
import router from './router'

function shouldInitAuth(pathname: string) {
  return pathname === '/boards' || pathname === '/account' || pathname === '/notifications'
}

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

  // 過去の IndexedDB cache 残骸を起動時に消去 (DB 同期に一本化したため不要)。
  void (async () => {
    if (typeof indexedDB === 'undefined') return
    try {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('inkly-document-cache')
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      })
    } catch (err) {
      console.warn('[main] failed to delete legacy pen-cache:', err)
    }
  })()

  // Board route なら DB から content を取得して open。
  // それ以外 (Landing / Dashboard) では何も復元せず空のまま。
  void (async () => {
    try {
      const boardId =
        typeof window !== 'undefined' ? resolveBoardIdFromLocation(window.location) : null
      if (!boardId) return

      const boardName =
        typeof window !== 'undefined' ? resolveBoardNameFromLocation(window.location) : null
      const remoteContent = await fetchBoardContent(boardId)
      if (!remoteContent?.content) return

      const bytes = decodeBoardContentBytes(remoteContent.content)
      const fileName = `${boardName ?? 'Untitled board'}.fig`
      const tabsMod = await import('@/app/tabs')
      await tabsMod.openFileInNewTab(
        new File([bytes], fileName, { type: 'application/octet-stream' })
      )
    } catch (err) {
      console.warn('[main] failed to restore board content from DB:', err)
    }
  })()
}
