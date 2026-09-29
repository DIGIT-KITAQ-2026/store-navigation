#!/bin/bash
# macOSのログイン時起動・5分ごとのAI検索監視を登録する。
# 実行: ./scripts/install-ai-watchdog.sh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LABEL="com.smart-store-navi.ai-watchdog"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/$LABEL.plist"
TEMPLATE="$PROJECT_DIR/scripts/$LABEL.plist.template"
LOG_DIR="$PROJECT_DIR/scripts/.demo-logs"

if [ "$(uname)" != "Darwin" ]; then
  echo "この自動監視スクリプトはmacOS (launchd) 用です。" >&2
  exit 1
fi

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrokが見つかりません。先に docs/デプロイ手順.md の手順で設定してください。" >&2
  exit 1
fi

mkdir -p "$PLIST_DIR" "$LOG_DIR"
# sedの置換文字として意味を持つ文字だけをエスケープする。
escaped_project_dir=$(printf '%s' "$PROJECT_DIR" | sed 's/[&|]/\\&/g')
sed "s|__PROJECT_DIR__|$escaped_project_dir|g" "$TEMPLATE" > "$PLIST_PATH"

# 既存登録があれば安全に置き換える。未登録時の失敗は無視する。
launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo "AI検索の監視を登録しました。ログイン時と5分ごとに実検索を確認します。"
echo "ログ: $LOG_DIR/watchdog.log"
echo "状態確認: launchctl print gui/$(id -u)/$LABEL"
