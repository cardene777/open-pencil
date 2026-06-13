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

  // 旧 IndexedDB restore は削除。 デザイン本体の SSOT は server DB に移行 (figma / miro 同等)、
  // board open / save は EditorView の loadBoardDocument / scheduleBoardDocumentUpload に集約する。
}
