# PerfTracer summary JSON schema

PerfTracer (`packages/core/src/profiler/perf-tracer.ts`) が `window.__pencilPerf.summary()` で返す JSON 構造。
e2e spec が `.context/scratch/perf-trace/{label}.json` に書き出す snapshot のうち、 `summary` field 部分の schema。

## トップレベル

```typescript
type PerfSummary = {
  totalEntries: number  // 計測されたイベント総数
  totalMs: number       // 全イベントの累計時間 (ms)
  stats: PerfBucketStat[]
}
```

## stats 配列の各要素

```typescript
type PerfBucketStat = {
  name: string       // metric 名 (例: 'frame', 'render:scene', 'input:mouseMove')
  track: string      // 4 track 分類 ('Renderer' | 'IO' | 'Collab' | 'Custom')
  count: number      // bucket 内のイベント発生数
  totalMs: number    // bucket 内の累計時間
  avgMs: number      // count > 0 なら totalMs/count、 0 なら 0
  p50Ms: number      // 中央値 (50 percentile)
  p95Ms: number      // 95 percentile (spike を除外した実用値)
  maxMs: number      // 最大値 (spike を含む worst case)
}
```

## 主要 metric 名一覧

### Renderer track

| name | 意味 |
|---|---|
| `frame` | requestAnimationFrame 1 周分の wall-clock 時間 (render 全体) |
| `render:scene` | scene content (page 全 child) の draw 時間 |
| `render:volatile` | volatile overlay (drag / position preview 等) の draw 時間 |
| `render:drawPicture` | scenePicture cache hit 時の drawPicture 単体時間 |
| `render:recordPicture` | scenePicture cache miss 時の record 単体時間 |
| `render:selection` | selection box / handle の draw |
| `render:rulers` | ruler の draw (showRulers=true 時のみ) |
| `render:flush` | Skia GPU flush (frame の最終 commit) |
| `render:sectionTitles` | section title の draw |
| `render:componentLabels` | component label の draw |

### IO track

| name | 意味 |
|---|---|
| `autosave:total` | autosave 1 回の総時間 (encode + write) |
| `autosave:encode` | kiwi encode 単体時間 |
| `autosave:write` | IndexedDB write 単体時間 |
| `autosave:fingerprint` | bytes fingerprint 計算時間 |

### Custom track

| name | 意味 |
|---|---|
| `input:mouseMove` | mouse move event 1 回の処理時間 (hit-test + selection 更新等) |
| `input:cursorMove` | カーソル位置更新 |
| `input:hoverCursor` | hover cursor 更新 |
| `input:resizeMove` | resize ハンドル drag 中 |
| `input:rotateMove` | rotate ハンドル drag 中 |
| `input:penHover` | pen tool hover |
| `input:nodeEditHover` | node edit mode hover |
| `move:total` | drag move 全体時間 |
| `move:snap` | snap guide 計算時間 |
| `move:dropTarget` | drop target 判定 |
| `move:positionPreview` | position preview 計算 |
| `move:requestRepaint` | repaint request |
| `graph:updateNodePreview` | preview node 更新 |

## 計測タイミング

PerfTracer は `__PENCIL_PERF_TRACE__` flag で gating されている。 e2e spec では明示的に enable する。

```typescript
await page.evaluate(() => {
  window.__pencilPerf?.enable()
  window.__pencilPerf?.clear()
})
```

`clear()` を呼ぶと event buffer を空にする。 計測区間を明確にしたい場合は phase 開始前に `clear()` を呼んで snapshot 取得直前まで蓄積する。

## summary() の精度限界

- `performance.now()` ベースなので 0.1ms 精度 (Chromium)
- count=1 の bucket は p50/p95/max が全て同値になる
- count が偶数の時の p50 は 2 値の平均ではなく lower value (簡易実装)
- p95 は count*0.95 の floor index、 count < 20 では精度が低い (代わりに max で判断)
