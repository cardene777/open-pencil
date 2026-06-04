# SwiftShader 固有挙動と spec 規約

Playwright config `launchOptions.args: ['--enable-unsafe-swiftshader']` で SwiftShader (CPU rasterizer) を強制する設定になっている。
WebGL / WebGPU acceleration を OFF にしているため、 実機 GPU (Metal / D3D11 / Vulkan) 環境とは挙動が異なる。

## 採用理由

- CI / Linux container では実機 GPU が無い (DRM device 不在)
- SwiftShader は deterministic な rasterization (実機 GPU は driver / vendor 依存で結果に差が出る)
- Pixel-perfect screenshot test を可能にする

## 既知の挙動差

### 1. 描画速度 (実機より遅い)

| node 数 | SwiftShader frame max | 実機 GPU 推定 |
|---|---|---|
| 1000 | 4-10 ms | 1-3 ms |
| 2000 | 18-22 ms | 5-10 ms |
| 3000 | (drag で crash) | 動作する可能性 |
| 5000 | (drag 未確認) | 動作する可能性 |

実機 GPU では SwiftShader より 3-5 倍速く、 SwiftShader で crash する閾値も実機では 2-3 倍まで動く可能性がある。 ただし spec の閾値は SwiftShader assume で書く (worst case を捉える)。

### 2. crash 閾値 (CPU memory pressure)

SwiftShader は CPU で raster するため、 GPU resource ではなく CPU memory pressure が crash trigger になる。
具体的には:

- 3000 node × drag 150 mouse move で renderer process kill
- console error 0 件 / pageerror 0 件 (純粋な OS-level kill)
- JS heap は kill 直前まで一定 (CanvasKit 側の C++ memory が膨らむため V8 heap には現れない)

実機 GPU では同じ閾値で動く保証はないが、 「実機でも crash する境界」 の安全マージンとして利用できる。

### 3. font 関連

`Local font access failed for "Noto Sans XX" Regular: SecurityError: User activation is required.` の warn が出る。
これは SwiftShader と関係なく Chromium 同源 (font access API は user activation 必須)、 test の error にはならない (warn のみ)。

console error filter で除外したい場合:

```typescript
editor.page.on('console', (msg) => {
  if (msg.type() === 'error') {
    if (msg.text().includes('Local font access failed')) return  // warn 扱い
    consoleErrors.push(msg.text())
  }
})
```

### 4. WebGL feature 制限

WebGPU feature の一部 (texture compression / advanced shader) が SwiftShader で未対応。
CanvasKit は SwiftShader 上で動作するが、 一部の advanced filter (image filter 系) は実機と表示差が出る。
screenshot test では `maxDiffPixelRatio: 0.01` `threshold: 0.3` (playwright config の default) で許容範囲内に収まる。

### 5. shader compilation 初回 cost

SwiftShader でも初回 shader compile に 100-500ms かかる。
これが「初回 frame の spike」 として現れることがある (1 frame 1300ms 等)。
e2e spec の assertion は count >= 2 の場合の p95 で判定するか、 frame max は warn 扱いにする運用が望ましい。

## spec 設計規約

SwiftShader assume で書くため、 以下を守る。

| # | 規約 |
|---|---|
| 1 | frame max 閾値は 60ms 以上 (SwiftShader CPU rasterization 余裕) |
| 2 | crash 閾値は dragSteps で分割し、 累積限界を探す (mega-doc.spec.ts 参照) |
| 3 | 実機 GPU 特有の feature (WebGPU advanced / texture compression) に依存しない spec を書く |
| 4 | screenshot test は SwiftShader の rasterization で固定 (snapshot 取得時の env を変えない) |
| 5 | 初回 frame spike を allow するため count=1 bucket の max は assertion 対象にしない |
