# Deploy 実行ガイド — 今すぐ実行できるコマンド集

実環境の状況を踏まえた「コピペで実行する手順」。
詳細な背景は `DEPLOY.md` 参照、 本ファイルはコマンド実行だけにフォーカス。

## 現状 (確認済)

| 項目 | 状況 |
|---|---|
| Fly CLI | ✅ Install 済 (`/opt/homebrew/bin/fly`) |
| Fly login | ❌ **未ログイン** ← Step 1 で対応 |
| Turso CLI | ✅ Install 済 |
| Turso login | ✅ `jfet-cardene` でログイン済 |
| Turso DB `pencil-editor` | ✅ **既存** (1.2 MB データ in)、 新規作成不要 |
| Resend API key | ❌ 未取得 ← Step 2 で対応 |
| Fly app `pencil-editor` | ❌ 未作成 ← Step 3 で対応 |
| Fly secrets | ❌ 未設定 ← Step 4 で対応 |

## Step 1: Fly login (ユーザー操作)

ターミナルで以下を実行:

```bash
fly auth login
```

ブラウザが開くので認証する。 完了後ターミナルに戻る。

確認:

```bash
fly auth whoami
```

メールアドレスが表示されれば OK。

## Step 2: Resend 登録 + API key 取得 (ユーザー操作)

ブラウザで https://resend.com にアクセス。

1. 「Sign up」 → GitHub or Google or email で登録
2. ダッシュボード左メニュー `API Keys`
3. `Create API Key` をクリック
4. Name: `pencil-editor-prod`、 Permission: `Full access` で作成
5. 表示された `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` を **必ずコピー** (1 度しか表示されない)

メモる: `INKLY_API_RESEND_KEY = re_xxx...`

(Google OAuth は省略可、 必要なら DEPLOY.md Step 4 参照)

## Step 3: Turso token 再取得 (推奨、 古い token は破棄)

既存 DB はそのまま使う、 token だけ更新:

```bash
cd /Users/cardene/Desktop/projects/pencil-editor

# token 新規発行 (eyJ... で始まる JWT が表示される)
turso db tokens create pencil-editor
```

表示された値をメモ: `TURSO_AUTH_TOKEN = eyJ...`

URL は既知: `libsql://pencil-editor-jfet-cardene.aws-ap-northeast-1.turso.io`

## Step 4: Auth secret 生成

```bash
cd /Users/cardene/Desktop/projects/pencil-editor

# 2 個の secret を一気に生成して表示 (両方メモる)
echo "INKLY_API_AUTH_SECRET=$(openssl rand -hex 32)"
echo "INKLY_API_JWT_SECRET=$(openssl rand -hex 32)"
```

出力された 2 つの値をメモる。

## Step 5: Fly app 作成 (まだデプロイしない)

```bash
cd /Users/cardene/Desktop/projects/pencil-editor

fly launch --no-deploy --copy-config --name pencil-editor
```

質問:

| 質問 | 答え |
|---|---|
| Would you like to set up Postgres? | **No** |
| Would you like to set up Upstash Redis? | **No** |
| Would you like to deploy now? | **No** |

完了したら次へ。

## Step 6: secrets 一括設定

メモした値を以下に当てはめて 1 コマンドで設定:

```bash
fly secrets set \
  INKLY_API_AUTH_SECRET="<Step 4 で生成した 1 個目>" \
  INKLY_API_JWT_SECRET="<Step 4 で生成した 2 個目>" \
  TURSO_DATABASE_URL="libsql://pencil-editor-jfet-cardene.aws-ap-northeast-1.turso.io" \
  TURSO_AUTH_TOKEN="<Step 3 でメモした eyJ...>" \
  INKLY_API_RESEND_KEY="<Step 2 でメモした re_...>"
```

確認:

```bash
fly secrets list
```

5 個の secret が並べばOK (DIGEST は表示されるが値は出ない)。

## Step 7: デプロイ実行

```bash
fly deploy
```

待つ:
- Docker build: 5-10 分 (`bun install` + `vite build`)
- イメージアップロード: 1-2 分
- machine 起動 + health check: 30 秒

完了すると URL が出る:

```
✓ Deployment complete
Visit your newly deployed app at https://pencil-editor.fly.dev/
```

## Step 8: 動作確認

```bash
fly open  # ブラウザで開く
fly logs  # サーバーログを見る (Ctrl+C で抜ける)
fly status  # machine 稼働状況
```

確認すること:
1. https://pencil-editor.fly.dev/ にアクセス → ランディングが表示
2. アカウント作成 (メール / Google OAuth は Step 設定時のみ)
3. board 作成 → 開ける
4. 共有ボタン → 招待モーダル → メールアドレス入力 → 招待送信
5. 招待されたメールアドレスに Resend からメールが届くか確認

メール届かない場合:
- スパムフォルダ確認 (`onboarding@resend.dev` から来る、 スパム判定されやすい)
- Resend ダッシュボード `Emails` で送信履歴確認
- `fly logs | grep -i resend` でエラーが出てないか

## 完了

以降の運用:

```bash
fly deploy        # コード変更後、 再デプロイ
fly logs          # ログ確認
fly secrets set X=y   # secret 追加
fly status        # 稼働状況
fly open          # ブラウザで開く
```

## トラブル時

詳細は `DEPLOY.md` 「トラブルシュート」 参照。

よくある:
- `INKLY_API_AUTH_SECRET` は **32 文字以上**必須 (32 byte hex = 64 文字なので OK)
- Turso URL は `libsql://` で始まる
- Resend key は `re_` で始まる
- migration が失敗したらログ確認、 多くは Turso 接続情報の typo
