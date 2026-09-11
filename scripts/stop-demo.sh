#!/bin/bash
# デモ用に起動したプロセスを止める。デモが終わったら実行する
# (caffeinateを止めないとスリープしないままになる)。
pkill -f "caffeinate -i npm start" 2>/dev/null && echo "  アプリを停止しました"
lsof -ti :3000 2>/dev/null | xargs -r kill 2>/dev/null
pkill -f "ngrok http 3000" 2>/dev/null && echo "  トンネルを停止しました"
sleep 1
pmset -g assertions 2>/dev/null | grep -q caffeinate \
  && echo "  ⚠ caffeinateのアサーションが残っています" \
  || echo "  スリープ防止も解除されました"
