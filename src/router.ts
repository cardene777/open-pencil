import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/app/auth/store'

// 認証必須 path の prefix list。 未ログイン時にこの path 群へアクセスすると LP へ
// 強制 redirect し、 returnTo クエリでログイン成功後に元の path へ戻す。
//   /dashboard          - 個人ダッシュボード
//   /boards             - ボード一覧
//   /notifications      - 通知一覧
//   /account            - アカウント設定
//   /admin              - 管理画面
//   /board/:id          - 編集画面 (招待リンク経由でも認証は必須、 招待 token 自体は
//                         /invite/:token がログインまで保持して beforeEach guard は通る)
//   /board/:id/settings - ボード設定
//
// 公開 path: / (LP)、 /demo、 /share/:roomId (room URL 共有)、 /invite/:token (招待入口)、
// /editor (autosave local file 編集の互換 path、 anonymous OK)
const PROTECTED_PATH_PREFIXES = [
  '/dashboard',
  '/boards',
  '/notifications',
  '/account',
  '/admin',
  '/board/'
]

// guest user (jfet.co.jp ドメイン外) に対して禁止する path 群。
// 招待された board だけが見える環境にするため、 これらは PermissionDeniedView に redirect。
// `/dashboard` と `/board/:id` (招待された board のエディタ) は guest でも開ける。
const GUEST_FORBIDDEN_PATH_PREFIXES = ['/boards', '/notifications', '/account', '/admin']

function isForbiddenForGuest(path: string): boolean {
  return GUEST_FORBIDDEN_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith('/')
      ? path.startsWith(prefix)
      : path === prefix || path.startsWith(`${prefix}/`)
  )
}

function isProtectedPath(path: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith('/')
      ? path.startsWith(prefix)
      : path === prefix || path.startsWith(`${prefix}/`)
  )
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/LandingView.vue') },
    { path: '/editor', component: () => import('./views/EditorView.vue') },
    { path: '/dashboard', component: () => import('./views/DashboardView.vue') },
    { path: '/admin', component: () => import('./views/AdminView.vue') },
    { path: '/boards', component: () => import('./views/BoardsView.vue') },
    { path: '/notifications', component: () => import('./views/NotificationsView.vue') },
    { path: '/account', component: () => import('./views/AccountView.vue') },
    { path: '/board/:id', component: () => import('./views/EditorView.vue') },
    { path: '/board/:id/preview', component: () => import('./views/PreviewView.vue') },
    { path: '/board/:id/settings', component: () => import('./views/BoardSettingsView.vue') },
    { path: '/invite/:token', component: () => import('./views/InviteRedirectView.vue') },
    { path: '/login/guest', component: () => import('./views/GuestLoginView.vue') },
    { path: '/demo', component: () => import('./views/EditorView.vue'), meta: { demo: true } },
    { path: '/share/:roomId', component: () => import('./views/EditorView.vue') },
    { path: '/permission-denied', component: () => import('./views/PermissionDeniedView.vue') },
    { path: '/docs', component: () => import('./views/DocsView.vue') },
    { path: '/docs/:section', component: () => import('./views/DocsView.vue') }
  ]
})

router.beforeEach(async (to) => {
  if (!isProtectedPath(to.path)) {
    return true
  }

  const auth = useAuthStore()
  // 初回ナビゲーション時は session 取得が未完了の可能性、 init 完了を待つ。
  if (!auth.initialized) {
    await auth.init()
  }

  if (!auth.isAuthenticated) {
    // 未ログインで保護 path へアクセス → LP へ。 returnTo に元の path + query を保持して
    // LP のログインボタンから戻ってこられるようにする (fullPath は ?query も含む)。
    return {
      path: '/',
      query: { returnTo: to.fullPath }
    }
  }

  // ログイン済 guest user (jfet.co.jp ドメイン外) が禁止 path に来たら
  // PermissionDeniedView へ redirect。 元 path を ?from で保持して説明文に使う。
  if (auth.isGuest && isForbiddenForGuest(to.path)) {
    return {
      path: '/permission-denied',
      query: { from: to.fullPath }
    }
  }

  return true
})

export default router
