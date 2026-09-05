#!/bin/bash
# 評価用の音声ファイルを macOS の say コマンドで生成する(macOS専用)。
# scripts/fixtures/voice-search/expected.json に書いた文を、複数の話者で読み上げさせる。
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/fixtures/voice-search"

read_field() { python3 -c "import json,sys;print(json.load(open('$DIR/expected.json'))['$1']['text'])"; }
keys() { python3 -c "import json;print(' '.join(k for k in json.load(open('$DIR/expected.json')) if not k.startswith('_')))"; }

for key in $(keys); do
  text="$(read_field "$key")"
  for voice in Kyoko Reed Sandy; do
    say -v "$voice" -o "$DIR/${key}_${voice}.wav" --data-format=LEI16@16000 "$text"
  done
done
echo "生成しました: $DIR"
