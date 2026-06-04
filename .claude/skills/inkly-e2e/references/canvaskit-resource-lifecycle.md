# CanvasKit Resource Lifecycle 規約

CanvasKit (Skia WASM build) の Picture / Surface / Image / Recorder の lifecycle を spec / 実装で守るための規約。
JS の GC では C++ 側のリソースが解放されないため、 明示的に `delete()` を呼ぶ必要がある。

## 対象 resource

| type | 説明 | delete 必要 |
|---|---|---|
| `Surface` | 描画 surface (canvas backing) | YES |
| `Picture` | record 済み draw command list | YES |
| `Image` | bitmap / texture | YES |
| `PictureRecorder` | record 中の builder | YES (finishRecording 後または cancel 後) |
| `Path` | vector path | YES |
| `Paint` | fill / stroke style | YES |
| `Font` | font handle | YES |
| `Typeface` | typeface handle | YES |

## 1. Picture lifecycle

```typescript
// ❌ NG — Recorder と Picture を delete し忘れる例
function badRecordPicture(ck) {
  const recorder = new ck.PictureRecorder()
  recorder.beginRecording(bounds)
  // ... draw commands
  const picture = recorder.finishRecordingAsPicture()
  return picture  // recorder と picture が両方 leak
}

// ✅ OK — recorder は finish 直後に delete、 picture は使用後 delete
function goodRecordPicture(ck) {
  const recorder = new ck.PictureRecorder()
  recorder.beginRecording(bounds)
  // ... draw commands
  const picture = recorder.finishRecordingAsPicture()
  recorder.delete()  // recorder は不要
  return picture
}

// caller 側
const picture = goodRecordPicture(ck)
canvas.drawPicture(picture)
picture.delete()  // 使用後 delete
```

## 2. cache 内の Picture lifecycle

Map に Picture を保持する cache では、 新 entry を set する前に古い entry の picture を delete する。

```typescript
// ✅ OK — set 前に古い picture を delete
const cached = cache.get(key)
if (cached) {
  cached.picture.delete()
}
const newPicture = recorder.finishRecordingAsPicture()
recorder.delete()
cache.set(key, { picture: newPicture, ... })

// ✅ OK — Map clear() 前に全 picture を delete
function clearCache(cache) {
  for (const entry of cache.values()) {
    entry.picture.delete()
  }
  cache.clear()
}
```

## 3. LRU eviction での delete タイミング

cache size が LRU limit を超えた時、 oldest entry の picture を delete してから Map から remove。

```typescript
function evictLru(cache, limit) {
  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value
    const entry = cache.get(oldestKey)
    if (entry) {
      entry.picture.delete()  // 必須
      cache.delete(oldestKey)
    }
  }
}
```

## 4. Surface lifecycle

```typescript
// ✅ OK — surface を再生成する時は前の surface を delete
function recreateSurface(r, width, height) {
  if (r.surface) {
    r.surface.delete()
  }
  r.surface = ck.MakeWebGLCanvasSurface(canvas)
}
```

## 5. renderer 全体破棄時

renderer 破棄 (page 切替 / unmount) 時は全 cache を flush し全 resource を delete。

```typescript
function disposeRenderer(r) {
  // Picture cache 全 clear
  for (const entry of r.subtreePictureCache.values()) entry.picture.delete()
  r.subtreePictureCache.clear()
  for (const pic of r.nodePictureCache.values()) pic?.delete()
  r.nodePictureCache.clear()

  // Surface
  r.surface?.delete()
  r.surface = null

  // Backing
  r.sceneBacking?.image.delete()
  r.sceneBacking = null
  r.sceneBackingBuild?.surface.delete()
  r.sceneBackingBuild = null
}
```

## 6. spec での leak 検出

spec で memory leak を検出する手段は限られる (CanvasKit C++ heap は performance.memory に現れない)。 間接的に以下で検出できる:

| 観点 | 方法 |
|---|---|
| Picture cache size | `await page.evaluate(() => window.inkly?.getRenderer?.()?.subtreePictureCache.size)` |
| Surface count | renderer 内に複数 surface があれば count を expose |
| drag 中の累積 crash | mega-doc.spec.ts 形式で drag step を増やして閾値探索 |
| Chrome crash | `page.on('crash', ...)` で renderer process kill 検出 (CanvasKit memory exhaustion の症状) |

## 7. テストでの delete 検出

unit test で picture.delete() 呼び出しを検証する時は spy を使う。

```typescript
test('LRU evict で oldest picture が delete される', () => {
  const deleteSpy = vi.fn()
  const fakePicture = { delete: deleteSpy }
  const cache = new Map([['old', { picture: fakePicture }]])
  evictLru(cache, 0)
  expect(deleteSpy).toHaveBeenCalledTimes(1)
  expect(cache.size).toBe(0)
})
```

## 8. 関連実装ファイル

- `packages/core/src/canvas/renderer/state.ts` — `invalidateScenePicture` / `clearSubtreePictureCache` / `invalidateNodePicture` / `invalidateAllPictures`
- `packages/core/src/canvas/renderer/retained-backing.ts` — `cachedSubtreePicture` の cache 管理
- `packages/core/src/canvas/renderer/pipeline.ts` — `recordScenePicture` (撤去予定) / `renderPageChildren`
- `packages/core/src/canvas/renderer/lifecycle.ts` — renderer 破棄時の cleanup
