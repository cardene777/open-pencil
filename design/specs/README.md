# design/specs/

`/pencil-spec` skill が生成するデザイン仕様書 (markdown) の配置先。

## 使い方

### 1. 仕様書を生成

```
/pencil-spec
```

ユーザーの依頼 (「家計簿 SaaS のデザイン作って」程度) から、 対話的に意図を引き出して仕様書を生成。
出力先: `design/specs/<product>.md`

### 2. 仕様書からデザイン生成

```
/pencil-design design/specs/<product>.md
```

仕様書を読んで `.fig` + `.pen` を生成 (`design/<product>.fig` / `design/<product>.pen`)。

## 2 段階フロー

```
ユーザー
  │
  │「家計簿 SaaS 作って」
  ↓
[pencil-spec]
  │ AskUserQuestion で 5-7 個質問
  │ 意図を詳細化
  ↓
仕様書 design/specs/<product>.md
  │ プロダクト概要 / ペルソナ / IA / 画面一覧 / デザイン原則 /
  │ ブランド / コンポーネント / 状態 / 制約 の 9 部構成
  ↓
[pencil-design]
  │ 仕様書を Read
  │ 公式 reference (web-app / mobile-app / landing-page / design-system) と統合
  │ inkly CLI eval で生成
  ↓
[成果物]
  - design/specs/<product>.md  (仕様書、 SSOT)
  - design/<product>.fig        (inkly ネイティブ)
  - design/<product>.pen        (Pencil 公式 interchange)
```

## メリット

| 観点 | 内容 |
|---|---|
| 仕様書が SSOT | 修正は仕様書を編集して再生成、 一貫性保証 |
| 複数 platform 対応 | 同じ仕様書から web / mobile / slide を別々に生成可能 |
| AI が補完しすぎない | 仕様書に明文化された意図のみを反映、 空想を減らせる |
| 仕様書だけ commit | デザイン (.fig / .pen) は再生成可能、 仕様書が真の design source |
| 課金ゼロ | terminal claude (subscription) のみ、 LLM 呼出以外コストなし |

## 仕様書テンプレ (pencil-spec 内蔵)

pencil-spec skill が以下のテンプレを内蔵:

| テンプレ | 用途 |
|---|---|
| `template-full-app.md` | SaaS web アプリ全体 |
| `template-full-app-fintech.md` | Fintech 全体 (KYC / 2FA / 規制 追加) |
| `template-full-ecommerce.md` | E-commerce 全体 |
| `template-full-mobile.md` | Mobile アプリ全体 |
| `template-marketing-site.md` | Marketing site 全体 |
| `template-single-lp.md` | LP 単独 |
| `template-single-dashboard.md` | Dashboard 単独 |
| `template-single-mobile-screen.md` | Mobile 1 画面 |
| `template-slides.md` | Slides プレゼン |
| `template-single-settings.md` | Settings 単独 |

pencil-spec が対話的に該当テンプレを選択して埋める。

## サンプルプロンプト集

`/pencil-spec` を試してみたい場合は、 [sample-prompts.md](./sample-prompts.md) に業種別のサンプル依頼文 (19 件) を用意した。

| 例 | 概要 |
|---|---|
| # 14 newsletter LP | 5 分で完結する小規模体験、 LP 1 枚 |
| # 16 EC ダッシュボード | 1 画面の dashboard、 デザインの密度感を見たい人向け |
| # 1 HR SaaS 全体 | 22 画面の大型仕様書、 全体感を見たい人向け |
| # 4 Fintech 全体 | KYC / 2FA / 規制対応込みの 24 画面 |
| # 18 機能紹介 slides | typography 中心の 10 slide pitch |

依頼文を 1 行コピーして claude に貼り付けるだけで仕様書生成が始まる。

