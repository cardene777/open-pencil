# 12: E-commerce 全体 (multi-screen)

EC サイト / D2C ブランド / マーケットプレイスの Storefront / Cart / Account / Admin / States を 1 プロンプトで生成。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
product card / color swatch / size selector / quantity stepper / cart summary / order status timeline / admin product editor 等の EC 標準パターンは AI が自動補完。

## プロンプト

~~~text
/pencil-design

[製品]
- 名前: <例 Heira>
- 1 文の説明: <例 D2C のセラミックタイル ブランド (家のリフォーム向け)>
- カテゴリ: <例 D2C インテリア / マーケットプレイス / EC サイト>
- 取扱商品: <例 ハンドメイドのセラミックタイル (床 / 壁 / 浴室)、 多色多サイズ>
- 対象顧客: <例 30-50 代、 注文住宅 / リノベ検討中、 デザイン重視>
- 平均注文額 (価格帯感): <例 8 万円>

[トーン (3-5 語)]
- <例 editorial / mate texture / 紙質感 / 落ち着いた>

[含める画面グループ]
- Storefront (Home / Category / Search results / Product detail / Reviews)
- Cart & Checkout (Cart / Shipping / Payment / Confirmation)
- Account (Sign in / Orders / Order detail / Wishlist / Addresses)
- Admin (Dashboard / Product list / Product edit)
- States (Empty cart / Out of stock / Order not found)
- Components

(↑ 不要な group は削除)

[特有要素 (EC 固有、 必要なものだけ)]
- <例 size guide>
- <例 variant selector (色 12 + サイズ 4)>
- <例 review with photo>
- <例 wishlist>
- <例 trade / B2B 価格>
- <例 subscription / 定期購入>
- <例 試着 / サンプル取り寄せ (¥500)>
- <例 配送オプション (Standard / Express / White glove with installation)>

[ブランド (任意)]
- メインカラー: <例 terracotta brown 系 / 任意>
- アクセント: <例 sand gold / 任意>
- 既存 brand guideline: <任意>

[決済]
- 必須決済方法: <例 Apple Pay / Shop Pay / クレジット / 銀行振込>

[言語 / 通貨]
- <default 英語 + USD、 日本円なら明記、 bilingual なら両方>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全画面の overview PNG と group ごと PNG を /tmp に保存して Read。
- 4 列グリッド配置 (x=0/1640/3280/4920、 y は group ごと 1200)、 全 frame は Screen/<group>/<name>。
- 全ピクセル数値 / 全コピー文 / 共通 component / E-commerce 標準 pattern は
  ~/.claude/skills/pencil-design/references/ の landing-page.md (Storefront) と
  web-app.md (Admin) と design-system.md (spacing / button hierarchy) に従って AI 補完。
- E-commerce 特有: product card (sold out / on sale / new badge) /
  color swatch / size selector / quantity stepper / cart summary / 配送 form /
  order status timeline (Ordered → Confirmed → Shipped → Delivered) /
  review stars + photo grid / admin product editor (variant matrix) / Trust badge
- Urgency / scarcity micro-copy ("Only 3 left" 等) を適切に組み込み。
~~~

## 補足

- 修正は自然文: 「Product detail に "Pairs well with" 推奨 4 件追加」「Cart の summary を sticky から bottom drawer mobile に」「Admin に Collections 管理画面追加」「Order detail に追跡地図 placeholder 追加」「全画面 mobile responsive を別 page に」
- EC は特有要素が大きく差別化を生むので、 list で具体的に書くと反映される
- 価格帯 (AOV) で UI の視覚重さが変わる (高単価 → 余白多 / 写真大、 低単価 → 情報密度高)
- subscription / 定期購入は標準パターンが特殊なので Optional で明記すると良い

## AI が補完する内容

- 全画面 4 列グリッド配置
- 全ピクセル数値 (landing-page + web-app + design-system 由来)
- 全コピー文 (商品名 / 説明 / button label / breadcrumb / empty cart 等)
- カラーパレット展開 (sale 色含む)
- typography scale (price は読みやすく SF Mono)
- E-commerce 標準 pattern (product card / color swatch / size selector / quantity stepper / cart summary / shipping form / order status timeline / review stars / admin product editor)
- Trust badge (free shipping / returns / authenticity)
- Urgency / scarcity micro-copy
- mobile responsive 想定の breakpoint
