# pencil-spec サンプルプロンプト集

`/pencil-spec` skill を試すためのサンプル依頼文。 業種別に複数用意してあるので、 1 行〜数行の自然文をコピーして terminal の claude に貼り付けるだけで仕様書生成が始まる。

## 使い方

1. 下の表から興味のあるものを選ぶ
2. 「依頼文」を丸ごとコピー
3. terminal で `claude` 起動
4. 貼り付けて Enter
5. AskUserQuestion で 5-7 個の質問が来るので答える
6. `design/specs/<product>.md` に仕様書が出力される
7. 続けて `/pencil-design design/specs/<product>.md` でデザイン生成

依頼文は **1 行で OK**、 `/pencil-spec` 自体は description trigger でも自動起動する。 確実に発動させたければ `/pencil-spec <依頼文>` の slash 形式で書く。

## 依頼文のコツ

| Tip | 例 |
|---|---|
| 1 行で何を作るかだけ書く | 「家計簿 SaaS のデザイン作って」 |
| 業種を入れる | 「Fintech / SaaS / E-commerce / Mobile app / Marketing site / Slides / Dashboard / LP」 |
| 規模感だけ書く (任意) | 「LP 1 枚」「アプリ全体 20 画面」「ダッシュボード 1 画面」 |
| ターゲットを 1 文 (任意) | 「30-40 代の共働き夫婦向け」 |

数値・hex・コピー文は **書かない**。 pencil-spec が AskUserQuestion で聞いてくれる。

## サンプル一覧

### SaaS / B2B 系

| # | 依頼文 (コピー用) | 想定出力 |
|---|---|---|
| 1 | `/pencil-spec 中小企業の HR 向け SaaS のデザインを作って。 採用・評価・給与の 3 軸で、 50-500 名規模の企業をターゲットに。 全体 (Marketing + Auth + Onboarding + Core + Settings + States) を作りたい。` | full-app テンプレ、 22 画面前後の仕様書 |
| 2 | `/pencil-spec チーム向けの非同期動画メッセージング SaaS のデザイン仕様書を作って。 Loom 系。 リモート 50-500 名規模、 5 分動画で文脈共有が主軸。` | full-app テンプレ、 動画機能 + Core 強化 |
| 3 | `/pencil-spec 個人向けのコード品質 SaaS のデザイン。 GitHub と連携、 PR ごとに品質スコアを表示。 個人開発者向け、 全体作りたい。` | full-app テンプレ + GitHub 連携想定 |

### Fintech 系

| # | 依頼文 | 想定出力 |
|---|---|---|
| 4 | `/pencil-spec 共働きカップル向けの資産共有 + 投資自動化アプリの仕様書を作って。 金商法対応 (KYC + 2FA 必須)、 日本国内のみ、 30-40 代向け。 全体作りたい。` | fintech テンプレ、 KYC / 2FA / 規制 section 込みの 24 画面 |
| 5 | `/pencil-spec 個人事業主向け会計 SaaS のデザイン。 確定申告サポート + 月次レポート自動生成。 全体作りたい。` | fintech テンプレ、 confidence + 数値表示重視 |
| 6 | `/pencil-spec 暗号資産取引所アプリの仕様書。 KYC + 2FA + cold wallet 連携、 日本居住者向け。` | fintech テンプレ、 取引画面 + KYC 強化 |

### E-commerce 系

| # | 依頼文 | 想定出力 |
|---|---|---|
| 7 | `/pencil-spec D2C のセラミックタイル EC サイトのデザイン仕様書。 リフォーム検討中の 30-50 代向け、 サンプル取り寄せ → 本注文の体験重視。 全体作りたい。` | ecommerce テンプレ、 size guide + サンプル取り寄せ込み |
| 8 | `/pencil-spec 小規模ロースター (コーヒー豆) の D2C EC の仕様書。 月額 subscription メイン、 個性的なブランド世界観。` | ecommerce テンプレ、 subscription 強化 |
| 9 | `/pencil-spec 中古本マーケットプレイスのデザイン。 個人売買、 5000 万円以下の中小規模、 日本国内のみ。` | ecommerce テンプレ、 マーケットプレイス向け Account 強化 |

### Mobile App 系

| # | 依頼文 | 想定出力 |
|---|---|---|
| 10 | `/pencil-spec メンタルヘルス + 睡眠 daily check-in アプリ。 25-40 代の knowledge worker、 燃え尽き予防、 iOS first。 全体作りたい。` | mobile テンプレ、 18 画面前後 (Onboarding + Auth + Core + Create + Settings) |
| 11 | `/pencil-spec 食事記録 + 栄養トラッキングアプリ。 25-35 歳健康志向、 3 タップ完了が目標、 iOS + Android 両対応。` | mobile テンプレ、 camera + tracking 強化 |
| 12 | `/pencil-spec 子育てカップル向けの育児ログアプリ。 授乳・睡眠・おむつ記録、 共有重視、 iOS。` | mobile テンプレ、 共有機能強化 |

### Marketing Site / LP 系

| # | 依頼文 | 想定出力 |
|---|---|---|
| 13 | `/pencil-spec OSS デザインツール pencil-editor の公式 marketing site の仕様書。 開発者向け、 confident corporate トーン、 全 page 作りたい。` | marketing-site テンプレ、 全 12 page |
| 14 | `/pencil-spec 個人で運営する技術 newsletter の LP 1 枚を作りたい。 ターゲットはエンジニア、 メール登録が goal。` | single-lp テンプレ、 LP 1 枚 |
| 15 | `/pencil-spec ヨガスタジオの LP。 初回体験予約が goal、 30-50 代女性、 落ち着いた wellness トーン。 LP 1 枚。` | single-lp テンプレ、 LP 1 枚 |

### Dashboard / 設定画面

| # | 依頼文 | 想定出力 |
|---|---|---|
| 16 | `/pencil-spec EC ショップ運営者向けリアルタイム計測 SaaS のダッシュボード 1 画面の仕様書。 月商 500-5000 万のショップ運営者向け。` | single-dashboard テンプレ、 1 画面 |
| 17 | `/pencil-spec 既存の Beacon Analytics SaaS の設定画面を作りたい。 既存 design system と統一、 Profile / Account / Security / Notifications / Billing / Members の 6 tab。` | single-settings テンプレ、 6 tab 設定画面 |

### Slides / プレゼン

| # | 依頼文 | 想定出力 |
|---|---|---|
| 18 | `/pencil-spec pencil-editor 機能紹介プレゼン (8 分 / 10 slide) の仕様書。 オンライン Zoom + プロジェクター両対応、 editorial minimalism 系。` | slides テンプレ、 10 slide |
| 19 | `/pencil-spec 投資家向け seed round pitch deck (10 slide) の仕様書。 SaaS スタートアップ、 confident startup トーン。` | slides テンプレ、 10 slide pitch |

## おすすめのお試し順

最初は **# 14 (newsletter LP)** か **# 16 (EC ダッシュボード単独)** が小規模で全体感を掴むのに適している。

1. # 14 で LP 1 枚仕様書 → デザイン生成 (5 分で完結体験)
2. # 1 か # 4 で SaaS / Fintech 全体仕様書を試す (より複雑な体験)
3. # 18 で Slides を試す (typography 中心のデザイン体験)

## 注意

- 仕様書 markdown は再生成可能、 デザイン (.fig / .pen) も再生成可能なので、 試して気に入らなければ気軽に削除して別案で試す
- 仕様書を編集してから `/pencil-design design/specs/<product>.md` で再生成すれば仕様変更が反映される
- 依頼文を「複数案出して」「3 通りの方向性で」と書くと、 pencil-spec が複数案を仕様書に併記してくれる
