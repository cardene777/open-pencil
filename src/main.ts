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

  // Restore the last opened document from IndexedDB so a reload does not
  // force the user to drag the file back in. We do this after mount + a
  // small delay so the editor / canvas are fully wired up before we feed
  // the cached file into openFileInNewTab.
  void (async () => {
    try {
      const [{ loadCachedPen, fileFromCachedPen, savePenToCache }, tabsMod, clientMod] =
        await Promise.all([
          import('@/app/document/io/pen-cache'),
          import('@/app/tabs'),
          import('@/app/api/client')
        ])
      // URL から board id を抽出 (/board/:id 形式)、 board に紐付かない場合は 'latest' fallback
      const boardMatch = typeof window !== 'undefined'
        ? window.location.pathname.match(/^\/board\/([^/]+)/)
        : null
      const boardId = boardMatch?.[1] ?? null

      let cached = await loadCachedPen(boardId)

      // board id があれば server DB (SSOT) から document を取得し、 cache より新しければ採用。
      // 招待された人 / 別ブラウザの owner / 同じ board の全 collaborator が
      // 同じ design を読み込めるようにするため、 IndexedDB cache は server より優先しない。
      if (boardId) {
        try {
          const remote = await clientMod.fetchBoardDocument(boardId)
          if (remote && (!cached || remote.updatedAt > cached.updatedAt)) {
            await savePenToCache(
              `${boardId}.fig`,
              'application/octet-stream',
              remote.bytes,
              boardId
            )
            cached = await loadCachedPen(boardId)
          }
        } catch (remoteError) {
          console.warn('[main] server document fetch failed:', remoteError)
        }
      }

      if (!cached) return
      await tabsMod.openFileInNewTab(fileFromCachedPen(cached), undefined, undefined, {
        skipPersistCache: true
      })
    } catch (err) {
      console.warn('[main] failed to restore cached document:', err)
    }
  })()
}
