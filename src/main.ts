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

  // Restore the last opened document so a reload does not force the user
  // to drag the file back in. Board routes prefer DB content first and
  // keep IndexedDB as the fast local fallback.
  void (async () => {
    try {
      const [{ loadCachedPen, fileFromCachedPen, savePenToCache }, tabsMod] = await Promise.all([
        import('@/app/document/io/pen-cache'),
        import('@/app/tabs')
      ])
      const boardId =
        typeof window !== 'undefined' ? resolveBoardIdFromLocation(window.location) : null
      const boardName =
        typeof window !== 'undefined' ? resolveBoardNameFromLocation(window.location) : null

      if (boardId) {
        try {
          const remoteContent = await fetchBoardContent(boardId)
          if (remoteContent?.content) {
            const bytes = decodeBoardContentBytes(remoteContent.content)
            const fileName = `${boardName ?? 'Untitled board'}.fig`
            await savePenToCache(fileName, 'application/octet-stream', bytes, boardId)
            await tabsMod.openFileInNewTab(
              new File([bytes], fileName, { type: 'application/octet-stream' }),
              undefined,
              undefined,
              { skipPersistCache: true }
            )
            return
          }
        } catch (err) {
          console.warn('[main] failed to restore board content from DB:', err)
        }
      }

      const cached = await loadCachedPen(boardId)
      if (!cached) return
      await tabsMod.openFileInNewTab(fileFromCachedPen(cached), undefined, undefined, {
        skipPersistCache: true
      })
    } catch (err) {
      console.warn('[main] failed to restore cached document:', err)
    }
  })()
}
