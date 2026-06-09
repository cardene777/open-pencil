# 11: Fintech Application 全体 (full multi-screen)

個人向け資産管理 / 投資 / 家計 / 暗号資産系 fintech アプリの全画面を 1 プロンプトで生成。

## 含まれる画面 (24 画面)

| グループ | 画面 |
|---|---|
| Marketing (3) | Landing / Security / Pricing |
| Auth (5) | Sign up / Sign in / 2FA verify / KYC document upload / KYC selfie |
| Onboarding (3) | Goal selection / Risk profile / Initial deposit |
| Core (6) | Home dashboard / Portfolio detail / Transaction history / Goal detail / Deposit / Withdraw |
| Settings (3) | Profile / Security / Linked accounts |
| States (4) | Empty / Pending KYC / Maintenance / Error |

合計 **24 画面** + 共通 component。

## 最強サンプル

```
/pencil-design

design/fintech-fullapp.fig + design/fintech-fullapp.pen に書き出して。

【プロジェクト】
- 製品: Cashlight — 共働きカップル向け資産共有 + 投資自動化
- ターゲット: 30-40 代の共働き夫婦、 世帯年収 1000-2000 万、 金融リテラシ中-高
- 解決する課題: 家計の不透明さと長期投資の continuity 不足
- 規制: 金商法対応 (KYC + 2FA 必須)、 日本国内のみ
- primary actions: 目標設定 / 入金 / portfolio リバランス

【全体トーン】
- 美学: editorial luxury + trust、 紙質感 (subtle grain)、 金融らしい integrity
- bg #FAFAF7 (warm off-white)、 surface white、 sidebar #FFFFFF、 dark section #0E1A2B (deep navy)
- accent gold #D4A85F、 sub-accent #2E7D62 (forest green、 positive)、 alert #C44536 (terracotta、 negative)
- text primary #1A1F36、 secondary #545B6E、 tertiary #8B92A7
- フォント: heading "Playfair Display" Bold (serif、 luxury feel)、 body "Inter" Regular、 mono "Söhne Mono"
- radius: card 16 / button 12 / input 12 / pill 999
- shadow: subtle、 #00112D14 blur 24 offset y 6
- spacing 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

【配置】4 列グリッド、 x = 0 / 1640 / 3280 / 4920、 y は group ごと 1000 ずつ

==================================================================
【グループ 1: Marketing (y=0)】
==================================================================

▼ Screen/Marketing/Landing (x=0, y=0、 1440 × 3600)
- header: logo "Cashlight" gold + nav (Product / Security / Pricing / Login) + CTA "Join waitlist" (gold)
- Hero 760: dark navy bg + subtle gold gradient
  - badge "INVITE-ONLY · BETA SPRING 2026"
  - headline 96 Playfair "Money you both understand."
  - sub 22 "Cashlight unifies your shared accounts, investments, and goals — in one private space designed for partners."
  - CTA "Request invite" gold + secondary "Watch 60s demo" outline white
  - 小文字 "We don't sell data. Ever." #6B7888
- Trust 120: 5 logo (TechCrunch / Forbes / WSJ / Bloomberg / FT) + eyebrow "Featured in"
- Problem 600: split 2 col、 左 title 44、 右 bullet 3 (90 min reconciling / decisions in isolation / goals slip)
- How it works 600: 3 step、 各 数字 01-03 大型 gold 50% opacity
  - Connect accounts (90 sec)
  - Set shared goals (vacation/home/retirement)
  - Auto-rebalance (monthly)
- Core features 3 sections 540 each、 左右交互 screenshot + 文字
  - "Shared dashboard that respects boundaries"
  - "Tax-aware portfolio rebalancing"
  - "Bi-weekly check-in nudges"
- Security section 480 dark: padlock icon + "Bank-level encryption" + 4 column (256-bit / SOC 2 / Zero-knowledge / FCA regulated) + 各 icon + 小文字
- Social proof 720 dark: stats row "$2.4B tracked" "12,000 couples" "94% retention" + 3 testimonial cards
- Pricing 800: 3 tier (Free / Pro highlighted / Couples Pro) + 機能 list
- FAQ 600: 5 件 (data sharing / vs Mint / international / closing account / regulation)
- Final CTA 480 dark: "Your money story, written together." + gold CTA
- Footer 320 #050811

▼ Screen/Marketing/Security (x=1640, y=0、 1440 × 2400)
- header same
- hero 320: "Security you can audit." + sub
- security pillars 720: 4 column
  - "Bank-level encryption" (256-bit AES、 in transit + at rest)
  - "Zero-knowledge architecture" (we never see your raw data)
  - "Read-only access" (we can never move money without 2FA)
  - "Independent audits" (SOC 2 Type II + annual pen test)
  - 各 icon + 200 word 説明
- Compliance section: 4 ロゴ (SOC 2 / GDPR / FCA / FSA Japan) + 説明
- Bug bounty section: "We pay up to $10,000 for bugs" + Hackerone link
- Footer

▼ Screen/Marketing/Pricing (x=3280, y=0、 1440 × 2400)
- header same
- toggle monthly / annual
- 3 tier: Free $0 / Pro $12mo / Couples Pro $20mo
- comparison table 24 row (公式 design-system reference の table 仕様準拠)
- FAQ pricing-only 4 件

==================================================================
【グループ 2: Auth + KYC (y=1000)】
==================================================================

▼ Screen/Auth/SignUp (x=0, y=1000)
- bg #FAFAF7 + 左上 logo + 右上 "Already have an account? Sign in"
- center card 440 white radius 16 padding 40
  - title 28 Playfair "Create your account"
  - sub 14 "Start with 5 minutes of setup"
  - SSO buttons 縦 2 (Google / Apple)
  - divider "or with email"
  - form: Full name / Email / Password (strength meter下) / Phone (国コード select + number)
  - checkbox terms
  - primary "Create account" full
  - 下に "Already have an account? Sign in"
- 右下に subtle gold blob decoration

▼ Screen/Auth/SignIn (x=1640, y=1000)
- 同様の card 構造
- title "Welcome back"
- form email + password
- "Forgot password?" + "Stay signed in" checkbox
- primary "Sign in"
- below: SSO 2 options

▼ Screen/Auth/2FA (x=3280, y=1000)
- center card 440
- icon top phone-vibrate 64 gold
- title "Verify your identity"
- sub "Enter the 6-digit code from your authenticator app or SMS"
- 6 個の OTP input box 横並び (各 56x64 radius 12 border)
- helper text "Code sent to ***-***-1234. Wrong number?"
- 大型 button "Verify"
- link "Use backup code instead"
- countdown timer "Resend code in 0:42"

▼ Screen/Auth/KYC_DocumentUpload (x=4920, y=1000、 1440 × 1100)
- 中央 card 880
- progress top: "Step 2 of 3 — Verify identity"
- title 28 "Upload a government-issued ID"
- sub "We need this to comply with regulations."
- 縦に 3 upload area (各 高 180、 dashed border + 中央 icon + 文字):
  - "Front of ID"
  - "Back of ID"
  - "Proof of address (utility bill / bank statement, last 90 days)"
- 各 area: drag&drop placeholder + click to upload + 受付フォーマット表示
- 下に注意書き card: "Your documents are encrypted and deleted after verification."
- 大型 primary "Continue" (disabled if missing)

▼ Screen/Auth/KYC_Selfie (x=6560, y=1000、 1440 × 1100)
- progress 3/3
- 中央 card 720
- title "Take a selfie"
- sub "Make sure your face is clearly visible"
- 大きな円形 camera preview placeholder 320x320 (frame)
- 周囲に "Look straight" / "Good lighting" / "No glasses or hat" icon + tip
- 大型 button bottom "Take photo"
- secondary "Use front camera"

==================================================================
【グループ 3: Onboarding (y=2000)】
==================================================================

▼ Screen/Onboarding/GoalSelection (x=0, y=2000、 1440 × 900)
- progress 1/3
- 中央 max 880
- title 32 "What are you saving for?"
- sub "Choose up to 3 goals"
- 6 goal card 3x2 grid (各 280x180 radius 16):
  - "🏠 Home down payment"
  - "🚗 Car"
  - "🌴 Vacation"
  - "🎓 Education"
  - "🏖️ Retirement"
  - "💍 Wedding"
  - 各 card hover: ring + slight scale (静的表現)、 selected: ring 2 gold
- primary "Continue" (disabled until 1+ selected)

▼ Screen/Onboarding/RiskProfile (x=1640, y=2000)
- progress 2/3
- 中央 max 720
- title "Your risk profile"
- sub "Cashlight will tailor your portfolio."
- 5 question stepper (Q1 of 5 表示)
- 現在 Q1: "How would you feel if your portfolio dropped 20% in a month?"
- radio 5 options 縦 (各 padding 16 radius 12):
  - "Sell everything immediately"
  - "Sell some to limit loss"
  - "Hold and wait"
  - "Buy a little more"
  - "Buy a lot more"
- "Previous" outline + "Next" primary

▼ Screen/Onboarding/InitialDeposit (x=3280, y=2000)
- progress 3/3
- 中央 max 720
- title "Make your first deposit"
- sub "Start with as little as ¥10,000"
- 大型 amount input (¥80px font、 SF Mono、 center align、 placeholder "¥0")
- preset chips 横並び: ¥10,000 / ¥50,000 / ¥100,000 / ¥500,000 / Custom
- payment method card (linked bank / "Add bank account" if empty)
- ETA card "Funds will be invested by Friday, June 13"
- primary "Confirm deposit"
- secondary "Skip — I'll fund later"

==================================================================
【グループ 4: Core (y=3000)】
==================================================================

▼ Screen/Core/Home (x=0, y=3000、 1440 × 1000)
- Sidebar 240 white border-right:
  - logo top + workspace selector (couple icon + "Yuki & Haruto")
  - nav (各 40 高 radius 8 padding 12):
    - Home (active、 bg #FAFAF7、 left border 3 gold)
    - Portfolio (icon "pie-chart")
    - Goals (icon "target")
    - Transactions (icon "list")
    - Insights (icon "trending-up")
  - section "TOOLS":
    - Calculators
    - Tax estimator
  - section "ACCOUNT":
    - Profile / Security / Help
  - bottom user dual card (2 avatar overlap + names)
- TopBar 64: date "Friday, June 9 · 8:42 AM" + 右に search + notification + avatar
- Main padding 32 gap 24:
  - Greeting card large (高さ 200、 bg navy #0E1A2B、 padding 32 radius 16 white text):
    - "Good morning, Yuki." 36 Playfair
    - "Your portfolio is up ¥48,500 this month." 18
    - gold accent bar + "+2.4%" right
    - 下に subtle line chart 60 高
  - 4 KPI cards 横並び (各 高 132 padding 24 radius 12 bg white):
    - "Total balance" ¥18,427,500
    - "Net worth this month" +¥48,500 (green)
    - "Cash" ¥2,140,000
    - "Goals on track" "4 of 5" (red on 1)
  - Goals section (高 360 white card padding 32):
    - header "Goals" + "View all"
    - 3 goal card 横 (各 1/3 width)、 progress bar + emoji + name + amount + ETA
  - Recent transactions (高 320 white card padding 32):
    - header "Recent activity" + filter
    - list 5 row (各 row 64 高): icon + name + amount + date

▼ Screen/Core/PortfolioDetail (x=1640, y=3000)
- sidebar Portfolio active
- Main:
  - page header "Portfolio" + sub "¥18,427,500 across 6 accounts"
  - 大型 chart 400 高 (asset allocation donut)
  - 右に legend (6 行: 各 dot color + label + percentage + amount)
  - 下に holdings table: 12 行、 列 (logo + name / ticker mono / shares / price / day change / value)
  - tax-loss harvesting card (insights system 由来): "Sell 5 shares of MSFT to harvest ¥12,400 in losses" + CTA

▼ Screen/Core/TransactionHistory (x=3280, y=3000)
- sidebar Transactions active
- Main:
  - header + filter chips (Type / Account / Date range / Amount)
  - search bar
  - table 15 row: date / type icon / description / category badge / account / amount (red/green) / status
  - pagination

▼ Screen/Core/GoalDetail (x=4920, y=3000)
- sidebar Goals active
- Main:
  - top: goal emoji 80 + title "🏠 Home down payment" + sub "Target ¥30M by Dec 2028"
  - 大型 progress card: ¥18.4M / ¥30M + 61% bar + "Right on track" badge
  - timeline chart 280 高 (projection vs actual)
  - 月次 contribution card: "Monthly auto-deposit ¥150,000" + "Adjust" button
  - "What if" calculator: slider for monthly amount + projected ETA update

▼ Screen/Core/Deposit (x=6560, y=3000、 1440 × 1000)
- modal full-screen takeover (背景半透明 navy)
- center card 480
- header "Deposit funds" + close X
- amount input large + preset chips
- from: linked account select (bank logo + name + ****1234)
- to: goal select (with icon)
- ETA card "Funds available Friday, June 13"
- primary "Confirm ¥150,000"

▼ Screen/Core/Withdraw (x=8200, y=3000)
- similar modal
- title "Withdraw" + warning bar "Withdrawals from goal accounts may affect your projection"
- amount + from goal select + to bank
- impact preview: "ETA will move from Dec 2028 to Mar 2029"
- primary "Confirm withdrawal"

==================================================================
【グループ 5: Settings (y=4000)】
==================================================================

▼ Screen/Settings/Profile (x=0, y=4000)
- Sidebar + sub-nav (Profile/Security/Linked Accounts/Tax/Notifications)
- 中央 max 880
- couple profile card (大): 2 avatar + 2 name input + relationship select
- Personal section: name / email / phone / address / DOB / nationality / tax residency

▼ Screen/Settings/Security (x=1640, y=4000)
- 中央 max 880
- Password section (last changed + change link)
- 2FA section: TOTP + SMS + Backup codes (各 row + status badge + manage)
- Active sessions table (5 row、 device + location + last active + revoke icon)
- Login history table (10 row)
- Danger zone red card: "Close account"

▼ Screen/Settings/LinkedAccounts (x=3280, y=4000)
- 中央 max 880
- Bank accounts list (4 行: bank logo + name + ****number + connected date + status + 3 dots menu)
- "+ Connect new account" CTA
- Investment accounts list (3 行同様)
- Credit cards (2 row)

==================================================================
【グループ 6: States (y=5000)】
==================================================================

▼ Screen/States/Empty_Goals (x=0, y=5000)
- sidebar + main
- center illustration: target icon 80 gold
- title "No goals yet"
- sub "Start saving for what matters"
- primary "Create your first goal" + secondary "Browse goal templates"

▼ Screen/States/PendingKYC (x=1640, y=5000)
- sidebar (limited、 大半が disabled tint)
- center alert card big:
  - clock icon 64 gold
  - "Verification in progress"
  - sub "We're reviewing your documents. This usually takes 24-48 hours."
  - timeline: Submitted ✓ → Under review (current、 animated indicator) → Approved → Account opened
  - "Check status" button + "Contact support" link

▼ Screen/States/Maintenance (x=3280, y=5000)
- center bigger card
- wrench icon 80
- title "We'll be right back"
- sub "Scheduled maintenance until 10:00 PM JST"
- countdown timer "37:24 remaining"
- "Follow updates" link to status page
- "Your funds are safe" subtle reassurance card

▼ Screen/States/Error (x=4920, y=5000)
- sidebar + center error card
- ⚠ 80 red
- title "Transaction failed"
- sub "We couldn't process your deposit of ¥150,000. No funds have been moved."
- error reason: "Insufficient balance in linked account"
- primary "Try with different account" + secondary "Contact support"
- error id mono small

==================================================================
【Components (x=10000)】
==================================================================

別領域に 8000 高 design system frame:
- Buttons (5 variant × 3 sizes × 3 state = 45)
- Inputs (8 type、 default/focus/error)
- Card 6 variant
- Badge 7 (default / gold / green / red / yellow / blue / pro)
- Modal templates
- Toast 3
- Avatar 6 sizes + dual
- Dropdown
- Table row
- Empty state template
- Loading state (spinner / skeleton 3 type)
- Chart placeholder (line / bar / pie / donut / area)

==================================================================
【公式 reference の遵守】
==================================================================

- web-app 16 原則 を全 dashboard 系で
- 特に #6 System Status Visibility (loading / empty / error / KYC pending を first-class)
- landing-page reference の Trust building (security section / compliance ロゴ / testimonial)
- mobile-app reference は別途 mobile 版作るときに参照
- design-system reference の spacing table、 button hierarchy
- Fintech 固有: amount は SF Mono (数値読みやすく)、 hex color の opacity 控えめ (信頼感)

【完了時】
- 全 24 画面 placeholder false
- 各 group PNG → /tmp/cashlight-{group}.png
- overview → /tmp/cashlight-overview.png (scale 0.4)
- components → /tmp/cashlight-components.png
- .fig + .pen
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen
【プロジェクト】<製品> ── <カテゴリ Fintech / Investing / Banking>、 ターゲット <X>、 規制 <Y>
【トーン】luxury + trust、 bg / accent / フォント (serif heading 推奨)
【画面 24】Marketing 3 + Auth+KYC 5 + Onboarding 3 + Core 6 + Settings 3 + States 4 + Components
【配置】4 列グリッド、 group ごと y 1000
【各 group の中身】<前述の構造を参考に要件記述>
【完了時】24 画面 placeholder false、 group PNG、 overview、 .fig + .pen
```
