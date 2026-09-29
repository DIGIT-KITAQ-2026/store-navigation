#!/bin/bash
# launchdから5分ごとに呼ばれ、実際のAI検索が失敗していたら推論サーバーと
# 固定ngrokトンネルを起動し直す。一度に複数起動しないようロックも取る。
set -uo pipefail

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LOG_DIR="$PROJECT_DIR/scripts/.demo-logs"
LOCK_DIR="${TMPDIR:-/tmp}/smart-store-navi-ai-watchdog.lock"
mkdir -p "$LOG_DIR"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  # 前回のチェックがまだ実行中。重複してモデルを温めたり再起動したりしない。
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_DIR/watchdog.log"
}

notify_failure() {
  local message="$1"
  log "$message"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$message\" with title \"Smart Store Navi AI\"" \
      >/dev/null 2>&1 || true
  fi
}

"$PROJECT_DIR/scripts/health-check.sh" >> "$LOG_DIR/watchdog.log" 2>&1
health_status=$?
if [ "$health_status" = "0" ]; then
  log "AI検索は正常です。"
  exit 0
fi

if [ "$health_status" = "2" ]; then
  # 商品カタログのDB取得失敗。ローカル推論サーバー・ngrokの再起動では直らないため、
  # 不要な再起動ループを避けて通知だけ行う。
  notify_failure "商品カタログを取得できません。Supabaseの設定を確認してください。"
  exit 2
fi

log "AI検索の異常を検知。推論サーバーとトンネルの自動復旧を開始します。"
if "$PROJECT_DIR/scripts/start-demo.sh" >> "$LOG_DIR/watchdog.log" 2>&1; then
  # start-demo.sh 内でも確認するが、終了直後のトンネル接続確立待ちを考慮して再確認する。
  sleep 5
  if "$PROJECT_DIR/scripts/health-check.sh" >> "$LOG_DIR/watchdog.log" 2>&1; then
    log "AI検索を自動復旧しました。"
    exit 0
  fi
fi

notify_failure "AI検索の自動復旧に失敗しました。scripts/.demo-logs を確認してください。"
exit 1
