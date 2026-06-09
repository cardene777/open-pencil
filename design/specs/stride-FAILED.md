# Stride 27 画面生成 失敗ログ (pencil-design v1)

`/pencil-design design/specs/stride.md` の実機実行で **全 27 画面 NG** という結果になった失敗ログ。
次のセッションで継続するための知見ベース。

## 結論

| 観点 | 結果 |
|---|---|
| 仕様書 (stride.md) | ✅ 良質 (217 行、 シニアデザイナー品質、 ペルソナ 3 件 / 画面 27 / 状態 6 種) |
| placeholder pre-create | ✅ 成功 (27 frame 全て page 直下に配置) |
| 詳細実装 | ❌ 致命的バグ (子要素 y 座標が画面外 y < 0 等に飛んだ) |
| reviewer agent | ✅ 動作実証 (Stride で全 27 画面 NG を正確に検出) |
| .fig / .pen 出力 | ✅ ファイルは存在するが内容は不可視 |

## reviewer agent の判定結果 (信頼できる)

**全 27 画面 NG (PASS 0 / NG 27)**

### Top 3 致命的問題

1. **全画面で screen ID tag が frame 外に存在しない** (項目 5 全滅)
2. **card / form field / button の frame が transparent fill + 透明 stroke で不可視** — text と数値だけが浮いている (項目 3 全滅、 inkly transparent fill 罠)
3. **Auth / Onboarding / States は title + sub も含めて placeholder のまま、 5 要素未満** で項目 1 不合格

### Reviewer による Top 3 Recommendations (skill v2 に反映予定)

1. 全画面で card / button / input の fill を明示的な hex (white / slate-50 等) で塗り、 stroke を slate-300 以上で指定。 transparent fill 罠の根本対処
2. 全画面の frame 外左上に固定位置で ID tag (M-01 / Marketing/Landing 形式) を text node で追加、 reviewer 識別を可能に
3. Auth / Onboarding / States は最小 5 要素ルールを満たすため、 card frame + title + sub + 主要 CTA + 補助要素を全画面で確実に描画する scaffold を先に組む

## 原因分析

### 根本原因

inkly CLI の Figma plugin API 経由で eval --code "-w" のとき、 helpers (sidebar / topbar 等) を Part 1 で定義し、 Part 2/3 で別 eval call として実行すると、 **helpers の座標計算と frame ローカル座標と page 絶対座標の混乱** が発生した。

具体的には:
- Part 1: 全 27 placeholder frame を作成、 page 直下に配置 (y=0/3800/4900/6000/...)
- Part 2/3: 既存 frame に対して内部要素を append、 子要素の x/y は frame ローカル座標を期待
- ところが Part 2/3 の `parent.height - 76` のような計算と、 何かの ID 解決失敗で、 page を親に勘違いしたか、 frame の y が子要素に伝搬したかで、 子要素の y が **-6000 等の負値** になった
- 結果: clipsContent: true で画面外の子要素は全て描画されず、 frame は背景色のみで真っ白

### 1 file で書き直しても同様の問題が出る可能性

問題は helpers が複数回 eval で呼ばれる構造ではなく、 inkly の Figma plugin API の座標計算挙動。
次セッションでは:

- 全画面 1 file で書き、 helpers も file 内で完結
- 子要素の x/y は必ず frame ローカル座標 (絶対座標から frame の x/y を引いた値) を使う
- `parent.x` や `parent.y` を 子要素の 位置計算に使わない (frame ローカル座標の話に閉じる)
- 各画面の中身を 1 関数にまとめ、 関数引数で frame を受け取る

## skill 改修 (本セッションで実施)

✅ pencil-design SKILL.md に Step 10 (生成後レビュー) + Step 11 (修正ループ) 追加
✅ references/reviewer-checklist.md 新規作成 (8 項目品質基準 + Agent reviewer 起動例)
✅ Reviewer agent (general-purpose subagent) で 27 画面の品質判定動作実証

## 次セッションでやるべきこと

| 優先 | 内容 |
|---|---|
| 1 | Stride 27 画面を 1 file で全面書き直し (座標 bug 修正、 helpers 完結) |
| 2 | reviewer-checklist の Top 3 Recommendations を skill のテンプレ JS に反映 |
| 3 | references/figma-plugin-api-quirks.md に「絶対座標 vs ローカル座標の混乱」を gotcha 追記 |
| 4 | newsletter LP (#14、 1 画面、 小規模) で skill v2 を検証 |
| 5 | 検証 PASS で Stride v3 に再挑戦 |

## ファイル状態

- `design/specs/stride.md` — 仕様書 (高品質、 そのまま使える)
- `design/stride.fig` — 失敗 .fig (内容不可視)、 参考のため残す
- `design/stride.pen` — 同上
- `design/specs/stride-FAILED.md` — 本ファイル (失敗ログ)
- `~/.claude/skills/pencil-design/SKILL.md` — Step 10/11 追加済 (skill v2)
- `~/.claude/skills/pencil-design/references/reviewer-checklist.md` — 新規 SSOT

## 学び

| 学び | 内容 |
|---|---|
| reviewer agent は機能する | Stride 全 27 画面の品質を正確に判定し Top 3 root cause も的確 |
| skill v1 だけでは品質保証されない | 生成後レビューと修正ループが必須、 v2 で追加済 |
| inkly Figma plugin API の座標は罠 | 絶対 vs ローカルの混乱が深刻、 figma-plugin-api-quirks.md に追記必要 |
| 大型 (27 画面) はリスク高 | 単一画面で v2 検証してから大型に挑戦すべき |
