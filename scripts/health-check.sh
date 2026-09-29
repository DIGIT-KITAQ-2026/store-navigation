#!/bin/bash
# 推論サーバー・トンネル・本番のAI検索を確認する。
#
# 失敗時は必ず終了コード1を返す。watchdogやCIから呼ぶため、表示だけして成功扱いに
# しないこと。URLは環境変数で上書きできるため、待機系ホストでもそのまま使える。
set -uo pipefail

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
NGROK_URL="${NGROK_URL:-https://tinwork-proxy-upheaval.ngrok-free.dev}"
VERCEL_URL="${VERCEL_URL:-https://smart-store-navi-hybrid.vercel.app}"
AI_SEARCH_URL="${AI_SEARCH_URL:-${VERCEL_URL%/}/api/search}"
AI_SEARCH_QUERY="${AI_SEARCH_QUERY:-小腹が空いた}"
CHECK_LOCAL="${CHECK_LOCAL:-1}"
failed=0
ai_failure_code=0

check_url() {
  local name="$1" url="$2" code
  code=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 20 "$url" 2>/dev/null) || code="000"
  if [ "$code" = "200" ]; then
    echo "  ✓ $name"
  else
    echo "  ✗ $name (HTTP $code)"
    failed=1
  fi
}

echo "推論サーバーとトンネルの状態"
if [ "$CHECK_LOCAL" = "1" ]; then
  check_url "ローカル (npm start)" "http://127.0.0.1:3000/"
fi
check_url "トンネル (ngrok)" "${NGROK_URL%/}/"
check_url "本番サイト (Vercel)" "${VERCEL_URL%/}/"

printf "  … AI検索を確認中"
response=$(curl -sS --connect-timeout 10 --max-time 180 -X POST "$AI_SEARCH_URL" \
  -H "Content-Type: application/json" \
  --data "{\"query\":\"${AI_SEARCH_QUERY}\"}" \
  -w $'\n%{http_code}' 2>/dev/null) || response=$'\n000'
printf "\r"

status="${response##*$'\n'}"
body="${response%$'\n'*}"
if [ "$status" = "200" ] && printf "%s" "$body" | grep -qE '"usedFallback"[[:space:]]*:[[:space:]]*false'; then
  echo "  ✓ AI検索 (意味検索が稼働しています)"
else
  echo "  ✗ AI検索 (HTTP $status / フォールバックまたは応答なし)"
  echo "    対処: scripts/.demo-logs/app.log と ngrok.log を確認し、Vercelの"
  echo "    AI_INFERENCE_BASE_URL / AI_INFERENCE_SHARED_SECRET も確認してください。"
  # /api/search がこのエラーを返すのは、AI処理より前のカタログ取得失敗だけ。
  # プロセスやトンネルを再起動しても直らないため、watchdogへ別の終了コードで伝える。
  if [ "$status" = "500" ] && printf "%s" "$body" | grep -q '店舗・商品情報の取得に失敗しました'; then
    ai_failure_code=2
  else
    failed=1
  fi
fi

if [ "$failed" = "1" ]; then
  exit 1
fi
exit "$ai_failure_code"
