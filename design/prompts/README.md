# pencil-design プロンプト集

`/pencil-design` skill を使って高品質なデザインを生成するための **プロンプトテンプレ集**。

## skill 呼び出し方

```
/pencil-design <指示文>
```

- 明示 slash command で skill を強制起動
- 自然文 (「LP を作って」等) でも description の trigger word で自動起動するが、 確実に発動させたいなら slash 形式を推奨

## 指示の 6 要素

「結構細かいデザイン指示」を出すには以下を漏れなく埋める。

| # | 要素 | 例 |
|---|---|---|
| 1 | 出力 | `design/landing.fig` / `design/dashboard.pen` |
| 2 | タイプ | LP / web-app dashboard / mobile-app / slides / 設定画面 |
| 3 | 製品・主題 | "open-source デザインツール pencil-editor の公式 LP" |
| 4 | トーン・美学 | "brutalist minimalism、 ダークモード、 アクセント緑 #B3D056" |
| 5 | セクション構成 | "Hero → Features (3 cards) → Pricing → Footer" |
| 6 | 各セクション詳細 | "Hero に大型 headline 80px Bold、 sub 18px、 CTA 2 つ" |

## テンプレ

| ファイル | 用途 |
|---|---|
| `01-landing-page.md` | マーケティング LP / プロダクト紹介ページ |
| `02-dashboard.md` | 管理画面 / 分析ダッシュボード |
| `03-mobile-app.md` | iOS / Android app 画面 |
| `04-slides.md` | プレゼン資料 (1920x1080) |
| `05-settings.md` | アプリ内設定画面 |

## 共通の上手な指示テクニック

### Do (推奨)

- 色は **hex で具体的に** (`#B3D056` のように)
- フォントは **family + weight + size 明記** (`Inter Bold 72px`)
- 数値は **px / 倍率で具体的に** (`padding 32px` / `gap 16px`)
- セクションごとに **コピー文を全文書く** (Hero headline / subhead / CTA label まで)
- 「複数 variation を試して」「3 案出して」と複数案を促す

### Don't (避ける)

- 「適切に」「いい感じに」「モダンに」だけ
- 数値を「ちょうどよく」「大きめ」「小さめ」と抽象的にする
- セクション名だけで中身を書かない
- 「Figma 風」「Apple 風」だけで具体度ゼロ

## 段階的指示の流れ

1. **テンプレを開く** (例: `01-landing-page.md`)
2. **6 要素を全て埋める** (空欄を残さない)
3. **`/pencil-design <埋めた指示>`** で起動
4. 出力された画像を確認
5. 修正が必要なら **「Hero の headline を 90px に、 background を #050811 に」** のように差分指示
6. 完成したら .pen / .fig 両方で保存指示

## 関連 references (skill 内)

| reference | 含まれる SSOT |
|---|---|
| `references/landing-page.md` | 公式 LP system prompt (Brief Hard Gate / Transformation Mapping / Hero rules / Anti-Slop) |
| `references/web-app.md` | web app 16 原則 |
| `references/mobile-app.md` | mobile 数値 spec (Status Bar 62 / Pill 36 等) |
| `references/slides.md` | slides typography / layout-01〜06 contract |
| `references/design-system.md` | component composition / spacing reference / button hierarchy |
| `references/figma-plugin-api-quirks.md` | sizing 罠 (★★★★★ 重要) |
| `references/inkly-cli-cookbook.md` | CLI 使用例 + `.pen` 変換器 |
