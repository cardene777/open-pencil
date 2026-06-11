/**
 * scripts/promo/record-flow.ts の page.evaluate 内で使う inkly editor の型定義。
 *
 * page.evaluate は serialization boundary なので「実物の inkly core 型」を直接
 * import すると import 自体が消えずビルドに乗ってしまう。 そのため
 * record-flow.ts 側で type-only export を使って構造のみ束ねる。
 *
 * これらは inkly core (packages/core/src/editor/...) の型ではないが、 record-flow.ts
 * が依存する最小 API のサブセットを SSOT として 1 か所に集約することで、 inkly 本体
 * の API が変わったときに record-flow.ts 全 page.evaluate を grep / typecheck で
 * 一気に更新できるようにする。
 */

export interface PromoSceneNode {
  id: string
  type: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface PromoInklyStoreState {
  currentPageId?: string
  zoom?: number
  panX?: number
  panY?: number
}

export interface PromoInklyStore {
  state?: PromoInklyStoreState
  getChildren?: (id: string) => PromoSceneNode[]
  graph?: {
    getNode?: (id: string) => PromoSceneNode | null
    updateNode?: (id: string, changes: unknown) => void
  }
  select?: (ids: string[]) => void
  clearSelection?: () => void
  zoomToFit?: () => void
  requestRepaint?: () => void
}

export interface PromoInklyApi {
  getStore?: () => PromoInklyStore
  openFile?: (path: string) => Promise<void>
}

export interface PromoInklyWindow extends Window {
  inkly?: PromoInklyApi
}
