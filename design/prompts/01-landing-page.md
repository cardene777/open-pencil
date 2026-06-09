# 01: Landing Page プロンプトテンプレ

マーケティング LP / 製品紹介ページ用。

## 最強サンプル (そのままコピペで使える)

```
/pencil-design

design/landing-fintech.fig と design/landing-fintech.pen の両方に書き出して。

【タイプ】Landing Page (マーケティング LP)

【製品】
- 名前: Cashlight
- カテゴリ: 個人向け資産管理アプリ
- ターゲット: 30-40代の共働きカップル、 月収 60-100万円
- 解決する課題: 家計のリアルタイム共有と長期投資計画の自動化
- ゴール: アプリのウェイトリスト登録 (primary CTA)

【トーン・美学】
- 方向性: editorial luxury (落ち着いたラグジュアリー、 雑誌風)
- メインカラー: #0E1A2B (dark navy) / アクセント #D4A85F (gold)
- 背景: #FAFAF7 (warm off-white)、 dark section は #0E1A2B
- フォント: heading "Playfair Display" Bold / body "Inter" Regular
- 全体に subtle なグレイン texture、 オーバル / 円のあしらい
- 画像: 30-40 代のカップルが投資資料を見て微笑む系 (transformation imagery)

【ページ幅】1440 px、 高さは内容で fit_content

【セクション構成】上から順に
1. Header
2. Hero
3. Trust logos (信頼ロゴ列)
4. Problem / Solution
5. How it works (3 step)
6. Core feature (大きく 3 つ縦並び)
7. Social proof (testimonial + stats)
8. Pricing (3 tier)
9. FAQ (4 件)
10. Final CTA
11. Footer

【各セクション詳細】

1. Header (高さ 80px、 padding 横 64)
   - 左: Cashlight (logo、 fontSize 22 Bold)
   - 右: ナビ「Features」「Pricing」「Blog」「Login」+ primary CTA「Join Waitlist」(緑系ではなく gold #D4A85F)

2. Hero (高さ 760、 padding 上下 120 横 120)
   - bg: dark navy #0E1A2B + subtle radial gradient gold center
   - badge top: "INVITE-ONLY · BETA SPRING 2026" (12px、 letter-spacing 2、 gold)
   - headline: "Money you both understand." (96px Playfair Bold、 white、 max 2 行)
   - sub: "Cashlight unifies your shared accounts, investments, and goals — in one private space designed for partners." (20px Inter、 #B8C0CC、 width 720)
   - CTA 2 つ:
     - primary "Request invite" (gold bg、 文字 #0E1A2B、 padding 18/40、 radius 100)
     - secondary "Watch 60s demo" (transparent bg、 white outline、 同 size)
   - 下部に "We don't sell data. Ever." 小文字 (12px、 #6B7888)

3. Trust logos (高さ 120、 bg #FAFAF7)
   - "Featured in" eyebrow (11px、 letter-spacing 2、 muted)
   - 横並び 5 ロゴ (TechCrunch / The Verge / Wired / FastCompany / Forbes 想定の placeholder rectangle)

4. Problem / Solution (高さ 600、 bg white)
   - 左右 2 列
   - 左: "Most couples manage money in 4 apps and a spreadsheet." (44px、 #0E1A2B)
   - 右: bullet 3 件
     - "Reconciling balances takes 90 min every week"
     - "Investment decisions made in isolation"
     - "Goals slip because no one's tracking the whole picture"

5. How it works (高さ 600、 bg #FAFAF7)
   - eyebrow "HOW IT WORKS"
   - 大型タイトル "Three steps to financial clarity together."
   - 横並び 3 card:
     - 01 Connect accounts: "Securely link both partners' accounts in 90 seconds."
     - 02 Set shared goals: "Vacation, home, retirement — Cashlight forecasts each."
     - 03 Auto-rebalance: "Monthly contributions adjust to keep you on track."
   - 各 card: 数字 01-03 を巨大表示 (120px、 gold 50% opacity)

6. Core features (上下 3 セクション、 各 540 高さ、 bg 交互 white / off-white)
   - 各セクション: 左にスクリーンショット placeholder (640x400、 16:9)、 右に文字
   - Feature 1: "Shared dashboard that respects boundaries"
   - Feature 2: "Tax-aware portfolio rebalancing"
   - Feature 3: "Bi-weekly check-in nudges"

7. Social proof (高さ 720、 bg #0E1A2B、 white text)
   - 上に stats row: "$2.4B tracked", "12,000 couples", "94% retention"
   - 下に testimonial 3 件、 顔写真 placeholder + 名前 + 引用文 (50 文字以内)

8. Pricing (高さ 800、 bg #FAFAF7)
   - eyebrow "PRICING"
   - title "Simple, transparent, no card to start."
   - 3 tier 横並び:
     - Free: $0/mo, 基本機能, "Start free"
     - Pro: $12/mo, 投資 + 税最適化, "Start 14-day trial" (highlighted、 gold border)
     - Couples Pro: $20/mo, 共有 + concierge, "Talk to us"

9. FAQ (高さ 600、 bg white)
   - 4 件、 accordion 風 (収納状態で表示)
   - Q1: "Is my data shared with the other partner?"
   - Q2: "How is this different from Mint or YNAB?"
   - Q3: "Do you support international accounts?"
   - Q4: "What happens to the data if we close the account?"

10. Final CTA (高さ 480、 bg #0E1A2B center alignment)
    - title "Your money story, written together." (64px Playfair white)
    - sub "Join the waitlist. Be the first 500 to get lifetime Pro free." (18px #B8C0CC)
    - CTA "Request invite" (gold)

11. Footer (高さ 320、 bg #050811、 padding 64)
    - 左: logo + tagline + 個人情報保護 link
    - 右: 4 column nav (Product / Company / Legal / Resources、 各 4-5 link)
    - 下部 copyright "© 2026 Cashlight Inc. Made for partners, never marketers."

【Anti-Slop ルール (公式 LP reference より)】
- flat background 禁止、 全 section に grain / gradient / texture
- card pattern を boilerplate にしない、 1-2 card は asymmetric layout
- AI image を text の背景にしない、 必ず独立 frame
- generic な Space Grotesk 禁止 (今回は Playfair + Inter)

【完了時】
- 全体 PNG export を /tmp/landing-fintech.png に保存
- セクションごと PNG も /tmp/lf-{section}.png に保存
- 最後に Read で目視確認
- 不具合あれば 3 回まで修正
- 完了後 .fig と .pen の両方をユーザーに報告
```

## 短縮版 (要素だけサクッと埋めて使う)

```
/pencil-design

【出力】design/<name>.fig + .pen
【タイプ】Landing Page
【製品】<製品名> ── <ジャンル>、 <ターゲット>、 解決課題 <X>
【ゴール】<primary conversion>
【トーン】<minimal / brutalist / luxury / playful 等> + メインカラー <#XXXXXX> アクセント <#YYYYYY>
【フォント】heading <name> Bold / body <name> Regular
【セクション】Header / Hero / Features (3) / Social proof / Pricing / FAQ / Final CTA / Footer
【Hero 詳細】headline "<英文>" / sub "<英文>" / CTA 2 つ ("<primary>" gold / "<secondary>" outline)
【Features 詳細】タイトル / 各 card の名前 + 説明文
【Final CTA】title "<英文>" / sub "<英文>" / CTA "<label>"
【完了時】.fig + .pen 両方、 PNG 検証付き
```

## 変更指示の出し方 (生成後)

```
landing-fintech.fig の Hero を以下に変更:
- headline を 84px に
- bg を #0A1424 に
- CTA primary を gold から #FF6B35 (warm orange) に
- 下に scroll cue (↓ icon) を追加 (24px、 white 60% opacity)
PNG 再 export して確認まで実施。
```

差分指示は **「何を」「何に」「どこを」「最後に何で確認」** の 4 点セットで書く。
