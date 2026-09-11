#!/bin/bash
# 推論サーバーとトンネルが生きているかを確認する。スリープ復帰後やデモ前に実行する。
NGROK_URL="https://tinwork-proxy-upheaval.ngrok-free.dev"
VERCEL_URL="https://smart-store-navi-hybrid.vercel.app"

check() {
  local name="$1" url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$url" 2>/dev/null)
  if [ "$code" = "200" ]; then echo "  ✓ $name"; else echo "  ✗ $name (HTTP $code)"; fi
}

echo "推論サーバーとトンネルの状態"
check "ローカル (npm start)" "http://localhost:3000/"
check "トンネル (ngrok)" "$NGROK_URL/"
check "本番サイト (Vercel)" "$VERCEL_URL/"

printf "  … AI検索を確認中"
RESULT=$(curl -s --max-time 180 -X POST "$VERCEL_URL/api/search" \
  -H "Content-Type: application/json" -d '{"query":"小腹が空いた"}' 2>/dev/null)
printf "\r"
if echo "$RESULT" | grep -q '"usedFallback":false'; then
  echo "  ✓ AI検索 (委譲が効いています)          "
else
  echo "  ✗ AI検索 (推論サーバーに届いていません) "
  echo
  echo "  対処: 次の2つが動いているか確認してください"
  echo "    1) npm start"
  echo "    2) ngrok http 3000 --url=tinwork-proxy-upheaval.ngrok-free.dev"
fi
