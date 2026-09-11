#!/bin/bash
# デモ用の推論サーバーとトンネルを立ち上げる。
# 動いているものはそのまま使い、落ちているものだけ起動し直す(何度実行してもよい)。
#
#   ./scripts/start-demo.sh
#
# ログは scripts/.demo-logs/ に出る。止めるときは ./scripts/stop-demo.sh
cd "$(dirname "$0")/.." || exit 1

NGROK_DOMAIN="tinwork-proxy-upheaval.ngrok-free.dev"
LOG_DIR="scripts/.demo-logs"
mkdir -p "$LOG_DIR"

# ── アプリ本体 ───────────────────────────────────────────────
if curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/ 2>/dev/null; then
  echo "  ✓ アプリは起動済み"
else
  echo "  … アプリを起動します"
  # 残骸が3000番を掴んでいることがあるので先に掃除する
  lsof -ti :3000 2>/dev/null | xargs -r kill 2>/dev/null
  sleep 2
  # caffeinate -i でバッテリー駆動でも放置スリープを防ぐ(フタは開けたままにすること)
  nohup caffeinate -i npm start > "$LOG_DIR/app.log" 2>&1 &
  for _ in $(seq 1 45); do
    curl -s -o /dev/null --max-time 2 http://127.0.0.1:3000/ 2>/dev/null && break
    sleep 2
  done
  curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/ 2>/dev/null \
    && echo "  ✓ アプリを起動しました" \
    || { echo "  ✗ アプリの起動に失敗 → $LOG_DIR/app.log を確認"; exit 1; }
fi

# ── トンネル ─────────────────────────────────────────────────
# ngrokの無料プランは同じドメインで1つしか起動できないため、生きているなら触らない
if curl -s -o /dev/null --max-time 15 "https://$NGROK_DOMAIN/" 2>/dev/null; then
  echo "  ✓ トンネルは接続済み"
else
  echo "  … トンネルを張り直します"
  pkill -f "ngrok http 3000" 2>/dev/null
  sleep 3
  nohup ngrok http 3000 --url="$NGROK_DOMAIN" > "$LOG_DIR/ngrok.log" 2>&1 &
  for _ in $(seq 1 20); do
    curl -s -o /dev/null --max-time 5 "https://$NGROK_DOMAIN/" 2>/dev/null && break
    sleep 2
  done
  curl -s -o /dev/null --max-time 15 "https://$NGROK_DOMAIN/" 2>/dev/null \
    && echo "  ✓ トンネルを張り直しました" \
    || { echo "  ✗ トンネルの接続に失敗 → $LOG_DIR/ngrok.log を確認"; exit 1; }
fi

echo
./scripts/health-check.sh
