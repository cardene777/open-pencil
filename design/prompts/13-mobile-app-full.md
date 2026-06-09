# 13: Mobile App 全体 (full multi-screen)

iOS / Android アプリの全画面を 375 × 812 で一括生成。 公式 mobile-app reference の数値 spec を全画面で厳守。

## 含まれる画面 (18 画面)

| グループ | 画面 |
|---|---|
| Onboarding (3) | Splash / Onboarding 3 step / Permissions |
| Auth (4) | Sign up / Sign in / OTP / Password reset |
| Core (5) | Home / List / Detail / Search / Filter modal |
| Action (3) | Create flow 3 step (camera / preview / publish) |
| Settings (3) | Profile / Notifications / About |

## 最強サンプル (健康トラッキングアプリ例)

```
/pencil-design

design/mobile-fullapp.fig + .pen に書き出して。

【プロジェクト】
- 製品: Pulse — メンタルヘルス + 睡眠 daily check-in app
- ターゲット: 25-40 代の knowledge worker、 燃え尽き予防
- primary action: 1 分の daily mood check-in
- platform: iOS first (Android responsive 後)

【全体トーン】
- 美学: warm minimalism + 朝の光感、 friendly
- bg #FFF8F0 (warm cream)、 surface white、 dark #1A1F2E
- accent #4A6FA5 (calm blue)、 sub #F4C95D (warm yellow)
- mood colors: joy #F4C95D / calm #4A6FA5 / sad #6B7FBF / anger #DB6B5E / anxious #B69BD8
- text primary #1A1F2E、 secondary #5E6B7E、 tertiary #A8B0BD
- フォント: heading "Söhne" Bold (or Inter Bold)、 body "Inter"
- radius: card 24 / button 16 / input 16 / pill 999 (mobile らしく大きめ radius)
- shadow: subtle #0000000A blur 16 offset y 4

【画面サイズ】全 375 × 812 (iPhone 標準)

【配置】4 列、 x=0/575/1150/1725 (gap 200)、 y group ごと 1000

==================================================================
【共通要素 (全画面で繰り返し)】
==================================================================

- Status Bar (62 px、 公式値必須):
  - 左 "9:41" 17px SF Pro Bold #1A1F2E
  - 右 signal + wifi + battery (各 18px)
- Wrapper (公式 critical): 全 content を 1 vertical stack の中に、 padding 横 20、 gap 24

==================================================================
【Onboarding (y=0)】
==================================================================

▼ Screen/Onboarding/Splash (x=0, y=0)
- 全画面 bg accent #4A6FA5
- status bar (text white)
- 中央寄せ:
  - 大型 logo (animated でなく静止表現): 円 80 white + アイコン pulse、 円周りに subtle 波紋 3 重 white opacity
  - app name "Pulse" 40 Söhne Bold white、 letter-spacing 4
  - sub 14 white 80% "Mindful check-ins, daily."
- 下部 indicator dot 3 個

▼ Screen/Onboarding/Step1 (x=575, y=0)
- bg #FFF8F0
- Status Bar
- Wrapper:
  - 大型 illustration top (placeholder 円 240 + emoji 🌅、 friendly テイスト)
  - title 28 "How are you, really?" (DM Sans Bold)
  - sub 16 "Pulse helps you check in with yourself in 60 seconds. No streaks, no shame."
  - progress dots 3 (1 active accent)
  - 下部 sticky:
    - primary button full "Next"
    - skip text link "Skip intro"

▼ Screen/Onboarding/Permissions (x=1150, y=0)
- bg #FFF8F0
- title "Just 2 quick things"
- 縦 2 card:
  - Notifications card: bell icon 32 + title "Daily reminders" + sub "We'll nudge you once a day at the time you choose" + "Allow notifications" primary
  - Health card: heart icon 32 + title "Optional: Apple Health" + sub "Sleep + activity to enrich your check-ins" + "Connect Health" secondary outline
- bottom small "You can change these later in Settings"

==================================================================
【Auth (y=900)】
==================================================================

▼ Screen/Auth/SignUp (x=0, y=900)
- bg #FFF8F0
- back chevron top-left
- Wrapper:
  - title 32 "Create account" (24 同じ全 screen で統一)
  - sub 14 secondary
  - SSO buttons (各 56 高 radius 16):
    - Continue with Apple (black bg + apple icon)
    - Continue with Google (white outline + Google logo)
    - Continue with Email
  - divider "or"
  - Email + Password input (各 56 高 radius 16 padding 16 bg surface)
  - checkbox terms
  - 大型 button "Create" full primary
  - footer "Already have an account? Sign in"

▼ Screen/Auth/SignIn (x=575, y=900)
- similar
- title "Welcome back"
- email + password + "Forgot password?" right
- primary "Sign in"
- biometric icon button (Face ID 32 円 outline)

▼ Screen/Auth/OTP (x=1150, y=900)
- bg #FFF8F0
- back top-left
- Wrapper:
  - icon top phone 40 accent
  - title "Enter the code"
  - sub "Sent to ***-***-1234"
  - 6 OTP input (各 48x56 radius 12 border、 center text 24px Bold)
  - resend countdown "Resend in 0:42"
  - 大型 button "Verify"
  - link "Use different number"

▼ Screen/Auth/PasswordReset (x=1725, y=900)
- similar
- key icon
- "Reset password"
- email input
- primary "Send reset link"
- footer link "Back to sign in"

==================================================================
【Core (y=1800)】
==================================================================

▼ Screen/Core/Home (x=0, y=1800)
- Status Bar
- Wrapper (padding 横 20、 gap 24):
  - Greeting row (horizontal align center)
    - avatar 40 + "Good morning, Yuki" 14 Bold + "Sunday 8:42" 12 secondary
    - 右に notification bell icon (badge red dot)
  - Today's mood card (大、 高 280 bg accent #4A6FA5 white text padding 32 radius 24):
    - top eyebrow "TODAY'S CHECK-IN" 11 letter-spacing 2 white 70%
    - 大 title 32 "How are you feeling?" (white)
    - 横並び 5 emoji button (各 56 円 bg white 10%): 😊 😌 😐 😔 😰
    - sub 13 white 70% "Tap to log in 30 seconds"
  - Streaks card (高 132 padding 24 radius 16 bg white):
    - 左: 大 5 yellow + "day streak"
    - 中央: 区切り
    - 右: bar chart 7 day mini visualization
  - Insights card (高 200 bg white):
    - title "This week"
    - 3 行 stats: "5 check-ins" / "Mood trend ↗ +12%" / "Best day: Wednesday"
    - "View details" link bottom right
  - Suggested activities (高 auto):
    - section title "For you"
    - 横スクロール 3 card (各 240 幅 高 160 radius 16):
      - "3-min breathing exercise"
      - "Journal prompt: gratitude"
      - "Sleep meditation 10 min"
- Bottom Tab Bar (公式 spec 厳守):
  - container 高 62 + padding 12/21
  - Pill 高 62 radius 36 border #E5E7EB 1
  - 5 tab: Home (active) / Insights / + (FAB 56 円 accent) / Journal / Profile
  - icon 18 / label 10 Bold uppercase

▼ Screen/Core/List (x=575, y=1800)
- Status Bar
- Wrapper:
  - header row: title "Journal" 24 Bold + 右 filter icon + sort icon
  - search bar (高 48 radius 16 bg surface、 placeholder "Search entries...")
  - filter chips 横 4 (Today / Week / Month / Custom)
  - entry list 6 件 (各 card 高 96 padding 16 radius 16 bg white、 gap 12):
    - 左: emoji 32 mood + date stack
    - 右: title 14 Bold + body 13 secondary truncate 2 行
- Bottom Tab Bar

▼ Screen/Core/Detail (x=1150, y=1800)
- back chevron
- Wrapper:
  - date 13 secondary
  - mood emoji big 64 center + label "Calm"
  - title 24 Bold "Sunday morning thoughts"
  - meta row: time + mood tags (chip)
  - body text 18 line-height 28 (long form)
  - 写真 placeholder grid 2x2 (もし添付ある場合)
  - 下部 reactions row: heart + comment + share (icon size 24 outlined)
- bottom 補助 bar: "Edit" + "Delete" + close

▼ Screen/Core/Search (x=1725, y=1800)
- Status Bar
- back + search input focused state (cursor visible)
- recent searches section (6 chip)
- suggested filters section (mood 5 emoji)
- results list 4 entry preview

▼ Screen/Core/FilterModal (x=2300, y=1800)
- modal full-screen overlay (modal sheet 風)
- handle bar top (40x4 grey rounded)
- title "Filter & sort" + close X right
- sections:
  - Mood (emoji 5 multi-select)
  - Date range (preset chips + custom)
  - Tags (chip list)
  - Sort by radio
- bottom bar sticky: "Reset" outline + "Apply (12 results)" primary

==================================================================
【Create Flow (y=2700)】
==================================================================

▼ Screen/Create/MoodPicker (x=0, y=2700)
- Status Bar
- 中央寄せ:
  - title 28 "How are you right now?"
  - sub 14 secondary
  - 大型 emoji grid 2x3 (各 80 円 padding):
    - 😊 Joy / 😌 Calm / 😐 Neutral
    - 😔 Sad / 😰 Anxious / 😡 Angry
  - 選択時 ring 3 accent + label 表示
- bottom sticky button "Continue" disabled until select

▼ Screen/Create/Detail (x=575, y=2700)
- back + step indicator "2 of 3"
- Wrapper:
  - selected mood preview at top (small)
  - title "What's contributing?"
  - chip grid 横並び (multi-select、 各 padding 12/20 radius 999 border):
    - Work / Family / Health / Sleep / Relationship / Exercise / Money / Weather / Food / Caffeine / News / Social
  - title section 2 "Anything to add?"
  - textarea (高 160 bg surface padding 16 radius 16、 placeholder "Optional journal entry...")
  - 写真 attach button row 3
- sticky "Save check-in" primary

▼ Screen/Create/Confirm (x=1150, y=2700)
- 中央寄せ celebratory state:
  - 大型 ✓ icon 80 accent in circle 160
  - title 28 "Saved 🌱"
  - sub "5 day streak. You're building a habit."
  - mini summary card (mood emoji + tags + time)
- 下部 2 button: "View entry" primary + "Done" secondary

==================================================================
【Settings (y=3600)】
==================================================================

▼ Screen/Settings/Profile (x=0, y=3600)
- back + title "Profile" centered
- Wrapper:
  - avatar 96 center + "Change photo" link
  - form (each row 高 64 padding 16 bg white radius 16 gap 4):
    - Name / Email (disabled) / Username / Bio / Timezone / Language
    - 各 row: label left + value right + chevron
  - section title "Account"
  - rows: "Subscription Pro" + "Sign out" red text + "Delete account" red text
- bottom Tab Bar

▼ Screen/Settings/Notifications (x=575, y=3600)
- back + "Notifications"
- sections (各 group card radius 16):
  - "Daily check-in" toggle + time picker row "8:30 AM"
  - "Weekly summary" toggle + day select "Sunday"
  - "Milestones" toggle
  - "Tips & content" toggle
  - "Sound" radio (Gentle / Loud / Off)
  - "Quiet hours" toggle + time range
- bottom Tab Bar

▼ Screen/Settings/About (x=1150, y=3600)
- "About"
- app logo + name + version "1.0.0 (build 142)"
- list rows:
  - Privacy policy >
  - Terms of service >
  - Open source licenses >
  - Send feedback >
  - Rate on App Store >
- footer: "Made with care in Tokyo · 2026"

==================================================================
【Components (x=8000)】

design system frame:
- iOS Status Bar template
- Pill Tab Bar template
- Buttons (Primary / Secondary / Outline / Ghost / Destructive / Icon-only、 各 sizes)
- Input (text / search / OTP / textarea / select)
- Cards (mood / journal entry / insight)
- Avatar (32 / 40 / 56 / 96)
- Chips (filter / tag / mood)
- Modal sheet template
- Toast / Snackbar 3
- Empty / Loading / Error templates
- Icon set (24 size、 outlined style: home / journal / plus / profile / search / filter / sort / bell / settings / chevron / x)

==================================================================
【公式 mobile-app reference 厳守 (絶対)】

- Status Bar 62 px 全画面
- Wrapper single vertical stack で全 content 包む
- 全 Title font size 統一 (24 で全画面 ← この example)
- gap で section 区切り、 margin 使わない
- Tab Bar 数値: Pill 62 / 36 radius / Tab item 26 radius / Icon 18 / Label 10
- 1 primary intent per screen
- safe area / status bar inset 尊重
- One-handed reach (CTA は lower half)

【完了時】
- 全 18 画面 placeholder false
- 各 group PNG → /tmp/pulse-{group}.png
- overview 縦 (全画面 18 が grid に並んだ全体図) → /tmp/pulse-overview.png
- Tab Bar 単独確認 PNG → /tmp/pulse-tabbar.png
- .fig + .pen
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen
【プロジェクト】<製品> ── <カテゴリ Mobile app>、 ターゲット、 primary action
【画面サイズ】全 375 x 812 (iOS)
【トーン】カラー、 フォント、 radius、 mobile らしく大きめ pill radius
【画面 18】Onboarding 3 + Auth 4 + Core 5 + Create 3 + Settings 3 + Components
【公式数値 厳守】Status Bar 62 / Pill 36 / Tab item 26 / Icon 18 / Label 10
【完了時】全画面 placeholder false、 group PNG、 .fig + .pen
```
