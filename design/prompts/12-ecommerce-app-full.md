# 12: E-commerce 全体 (full multi-screen)

EC サイト / D2C ブランド / マーケットプレイスの全画面を 1 プロンプトで生成。

## 含まれる画面 (20 画面)

| グループ | 画面 |
|---|---|
| Storefront (5) | Home / Category / Search results / Product detail / Reviews |
| Cart & Checkout (4) | Cart / Shipping / Payment / Confirmation |
| Account (5) | Sign in / Orders / Order detail / Wishlist / Addresses |
| Admin (3) | Dashboard / Product list / Product edit |
| States (3) | Empty cart / Out of stock / Order not found |

## 最強サンプル

```
/pencil-design

design/ec-fullapp.fig + .pen に書き出して。

【プロジェクト】
- 製品: Heira — D2C のセラミックタイル ブランド (家のリフォーム向け)
- ターゲット: 30-50 代、 注文住宅 / リノベ検討中、 デザイン重視
- AOV (平均注文額): ¥80,000
- primary action: サンプル取り寄せ → 本注文

【全体トーン】
- 美学: editorial、 mate texture、 紙質感、 ゆったり余白
- bg #FAF8F4 (warm beige)、 surface white、 dark section #292724 (warm charcoal)
- accent #8B5E3C (terracotta brown)、 sub #C7A975 (sand gold)
- text primary #1F1B16、 secondary #6B5F50、 tertiary #A39685
- フォント: heading "Cormorant Garamond" Bold (serif、 editorial)、 body "Inter"
- radius: card 4 (小さめ angular)、 button 0 (直線的)、 input 4
- spacing 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96

【配置】4 列、 x=0/1640/3280/4920、 y group ごと 1200

==================================================================
【Storefront (y=0)】
==================================================================

▼ Screen/Storefront/Home (x=0, y=0、 1440 × 3600)
- header 88: logo "HEIRA" 24 letter-spacing 4 + nav (Shop / Lookbook / Story / Trade) + 右 (search / wishlist / cart badge / account icon)
- hero 800: 大型 image (background tile texture placeholder)、 中央寄せ:
  - eyebrow 13 letter-spacing 3 "NEW COLLECTION · 2026"
  - headline 96 Cormorant "Tile, reimagined."
  - sub 18 Inter "Hand-glazed by artisans in Tajimi, made for floors that last 100 years."
  - 横並び CTA: "Shop the collection" primary brown + "Order samples free" outline
- editorial section 720: 2 col (image left + text right)、 大型画像 + title 48 + body
- product grid 800 (4 col x 2 row): 各 320x400 (image 280 + name + dimension + price)、 hover state (overlay + "Quick view")
- lookbook strip 480: 横スクロール風 4 画像 placeholder + caption
- editorial story 640: 大型 image + quote text "Tiles aren't furniture. They're a foundation for daily ritual." + author attribution
- collection preview 640: 3 collection card (Earth / Sea / Stone)、 各 大型 image + name + product count
- testimonial 480: 3 quote + photo placeholder + name + project type (e.g. "Suburban renovation, Tokyo")
- newsletter section 320 dark: title "Be the first to see new collections" + email + button
- footer 320: 4 col link + Instagram feed strip + 著作権

▼ Screen/Storefront/Category (x=1640, y=0、 1440 × 2400)
- header same
- breadcrumb "Home / Floor tiles" small mono
- category hero 320: title 56 Cormorant "Floor tiles" + sub "Hand-glazed porcelain for residential and commercial."
- filter bar 64 sticky: 左 active filters as chips (Color: Beige × / Size: 300mm × / Price: ¥5-10k ×) + clear all、 右 sort dropdown + grid/list view toggle
- 左 sidebar 240 sticky:
  - Material accordion
  - Color swatches grid (12 円)
  - Size checkbox 6
  - Price range slider
  - Use case checkbox (Indoor / Outdoor / Wet area / Heating)
- 右 main: grid 3 col x 8 row = 24 product card (各 280x400)
- pagination
- bottom "Don't see your style? Custom orders available" CTA card

▼ Screen/Storefront/SearchResults (x=3280, y=0)
- search bar top focused state (query "natural beige")
- result count "47 results for 'natural beige'"
- top 3 suggested products (横並び card with badge "Best match")
- filter + grid same as category
- 別 section "Customers also searched": chip list "rough texture", "matte", "300mm", "subway tile"

▼ Screen/Storefront/ProductDetail (x=4920, y=0、 1440 × 2800)
- breadcrumb
- 上 main 2 col:
  - 左: image carousel (大 720x720 + thumbnail 5 strip 縦 80x80)
  - 右 (padding 64):
    - mini breadcrumb "Floor tiles"
    - title 36 Cormorant "Yuki Beige 300×600"
    - sub 14 "Hand-glazed matte porcelain"
    - price big 32 mono "¥8,400 / m²" + sub "¥84 / piece (300×600mm)"
    - color swatch row 6 (各 32 円、 selected ring)
    - size select 4 chip (200×400 / 300×600 / 600×600 / 900×900)
    - quantity input + m² calculator (auto convert)
    - 2 CTA 縦: "Add to cart" primary brown + "Order sample first ¥500" outline
    - 配送 ETA "Ships in 3-5 business days" + 説明 link
    - 4 trust badges 横 (国産 / 10 年保証 / Free returns / Trade discount)
- spec table 480 (左に長い属性 list + 右に値、 8 row)
- description 320 (3 column text)
- editorial photo section 480: 大型 image of installed tile + caption
- "Pairs well with" 360: 4 product card 横
- reviews summary 200: 4.8 stars + count + bar chart distribution
- reviews list 480: 4 review (avatar / name / rating / date / photo / text)
- recently viewed 320: 5 product card

▼ Screen/Storefront/Reviews (x=6560, y=0、 1440 × 2000)
- header + breadcrumb
- product mini header (image + name + 4.8 star)
- summary stats 200: 大型 4.8 + bar distribution 5 行
- filter chips (Rating / With photos / Verified buyer)
- review list 16 件 long form (各 padding 32、 avatar + name + rating + project type + body + photo grid + likes count)
- pagination

==================================================================
【Cart & Checkout (y=1200)】
==================================================================

▼ Screen/Cart/Cart (x=0, y=1200、 1440 × 1100)
- header + breadcrumb "Home / Cart"
- title "Your cart (3 items)"
- 2 col main + sidebar:
  - 左 cart items (各 row 高 160 padding 24 white):
    - product image 120
    - 中央: name + dimension + color swatch + "Edit"
    - 右上: 価格大
    - 右下: quantity stepper - 1 +
    - row 下に "Save for later" "Remove" link
  - + 別 add-on offer card "Get a Heira tile cleaner for 20% off"
  - 右 sticky summary 320:
    - "Order summary"
    - line items (subtotal / discount / shipping (Calculated at next step) / tax)
    - total big mono
    - promo code input
    - 大型 button "Checkout" primary
    - shop pay / Apple Pay quick checkout 別

▼ Screen/Cart/Shipping (x=1640, y=1200)
- step indicator top: Cart ✓ → Shipping (active) → Payment → Review
- 2 col layout:
  - 左 main 720:
    - title "Shipping address"
    - form: country select / full name / company optional / address1 / address2 / city / state / zip / phone / email
    - checkbox "Save to address book"
    - separator
    - delivery options 3 card (各 padding 24 radius 4 border):
      - "Standard" 5-7 days FREE
      - "Express" 2-3 days ¥3,000 (selected ring)
      - "White glove" 7-14 days ¥12,000 (with installation team)
    - 大型 next "Continue to payment"
  - 右 order summary sticky (same)

▼ Screen/Cart/Payment (x=3280, y=1200)
- step 3 active
- 左 main:
  - title "Payment"
  - tab 3: Credit card (active) / Apple Pay / Bank transfer
  - credit card form: card number / exp / cvc / name
  - billing address checkbox "Same as shipping" + form if unchecked
  - large "Pay ¥184,200" primary
- 右 summary

▼ Screen/Cart/Confirmation (x=4920, y=1200、 1440 × 1100)
- centered max 720
- 大型 ✓ icon 80 brown
- title 36 Cormorant "Thank you, Yuki."
- sub "Your order #HE-2026-06-09-0042 has been confirmed."
- 4 column quick info: Order number / Email / Total / ETA
- next steps card big: "What's next" with timeline 4 step
- 注文内容 mini list (3 row image + name + qty + price)
- CTA 横並び: "Track order" primary + "Continue shopping" outline
- 下に "Want to install with us?" upsell card

==================================================================
【Account (y=2400)】
==================================================================

▼ Screen/Account/SignIn (x=0, y=2400、 1440 × 900)
- bg #FAF8F4
- 中央 card 440 white padding 40 (border instead of shadow、 mate feel)
- title 28 Cormorant "Sign in to Heira"
- form email + password
- 大型 "Sign in" primary
- "Forgot password?" "Create account" link
- divider "or"
- "Continue as guest" outline (E-commerce 特有)

▼ Screen/Account/Orders (x=1640, y=2400)
- account sidebar 240 (Account / Orders active / Addresses / Wishlist / Trade program / Sign out)
- main:
  - header "Your orders"
  - filter chips (Status / Date / Amount)
  - 8 order card (各 padding 24 radius 4 border):
    - top: order number mono + date + status badge + total
    - bottom: 3-4 product mini image (40 円) + count + "View details"

▼ Screen/Account/OrderDetail (x=3280, y=2400、 1440 × 1100)
- account sidebar
- main:
  - back link + order number title
  - status timeline (Ordered ✓ Confirmed ✓ Shipped (current) → Delivered)
  - tracking card with provider + tracking number + estimated date
  - items table (4 row: image / name / qty / price)
  - 配送 info card (address + method)
  - payment info card (card last 4 + total)
  - actions: "Track package" / "Return items" / "Contact support" 3 button

▼ Screen/Account/Wishlist (x=4920, y=2400)
- account sidebar
- main:
  - title "Your wishlist (8 items)"
  - "Share wishlist" / "Move all to cart" 2 button
  - grid 3 col x 3 (8 card)

▼ Screen/Account/Addresses (x=6560, y=2400)
- account sidebar
- main:
  - title "Saved addresses"
  - "+ Add new address" outline button
  - 4 address card (各 padding 24 radius 4)、 default に gold badge

==================================================================
【Admin (y=3600)】
==================================================================

▼ Screen/Admin/Dashboard (x=0, y=3600、 1440 × 1000)
- admin sidebar dark #292724 (Products / Orders / Customers / Collections / Discounts / Reports / Settings)
- top bar 64 with store switcher
- main:
  - page header "Dashboard" + date range picker
  - 4 KPI: Revenue / Orders / Sessions / Conversion
  - main chart 360 revenue trend
  - 2 col bottom:
    - 左 Top products list 5
    - 右 Recent orders table 8

▼ Screen/Admin/ProductList (x=1640, y=3600)
- admin sidebar
- main:
  - header "Products (247)" + filter chips + "+ Add product" primary
  - 列 toggle (Image / Title / Status / Inventory / Price / Created / Actions)
  - table 12 row

▼ Screen/Admin/ProductEdit (x=3280, y=3600、 1440 × 1300)
- admin sidebar
- main 2 col:
  - 左 main 880:
    - title input full (product name)
    - description rich text editor placeholder
    - media section (drag drop multiple)
    - pricing card (price / compare-at / cost / margin auto-calc)
    - inventory card (track / sku / barcode / quantity)
    - shipping card (weight / dimensions)
    - variants section (size / color matrix table)
    - SEO accordion (title / description / handle / preview)
  - 右 sidebar 320 sticky:
    - status select (Active / Draft / Archived)
    - publishing card (channels checkboxes)
    - organization card (type / vendor / collections / tags)
    - "Save" primary at top + "Delete" link at bottom red

==================================================================
【States (y=4900)】
==================================================================

▼ Screen/States/EmptyCart (x=0, y=4900)
- header
- 中央 illustration: shopping bag icon 80 brown
- title "Your cart is empty"
- sub "Add some tiles to begin your project"
- CTA: "Shop the collection" primary + "Order free samples" outline

▼ Screen/States/OutOfStock (x=1640, y=4900)
- product detail layout
- price area に "Sold out" badge + back-in-stock waitlist signup card replace CTA
- "We'll email you when this returns. Estimated restock: late June"
- 別 product 4 件 "You might also like" 推奨

▼ Screen/States/OrderNotFound (x=3280, y=4900)
- account sidebar
- center error card
- ? icon 80
- title "Order not found"
- sub "We couldn't find an order with that number."
- input "Try a different order number"
- "Contact support" link

==================================================================
【Components】

x=8000 area:
- buttons (5 variant 0 radius、 ec-specific)
- product card 4 variant (default / sold out / on sale / new)
- color swatch
- price display (regular / sale / range)
- review stars
- quantity stepper
- cart summary block
- address card
- order status timeline

==================================================================
【公式 reference の遵守】

- web-app 16 原則 (admin 系)
- landing-page Hero / Anti-Slop (storefront home)
- design-system spacing / button hierarchy (全体)
- E-commerce 固有 best practices: trust badge / size guide / free shipping bar / urgency micro-copy ("Only 3 left")

【完了時】
- 全 20 画面 placeholder false
- group PNG / overview / components
- .fig + .pen
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen
【プロジェクト】<name> ── E-commerce <D2C / マーケットプレイス>、 ターゲット、 AOV
【トーン】editorial / minimal / playful / luxury、 カラー、 フォント (serif/sans)
【画面 20】Storefront 5 + Cart 4 + Account 5 + Admin 3 + States 3 + Components
【特有要素】size guide、 trust badge、 wishlist、 free shipping bar、 quick view、 stock indicator
【完了時】20 画面、 group PNG、 .fig + .pen
```
