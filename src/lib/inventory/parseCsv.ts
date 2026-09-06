/**
 * RFC4180ベースの最小限のCSVパーサー(依存追加を避けるための自前実装)。
 * ダブルクォートで囲んだフィールド内のカンマ・改行・エスケープ("")に対応する。
 * 改行はCRLF/LFのどちらも許容する。純粋関数(文字列 → 文字列の二次元配列)。
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const length = text.length;

  function pushField() {
    row.push(field);
    field = "";
  }

  function pushRow() {
    pushField();
    rows.push(row);
    row = [];
  }

  while (i < length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      pushRow();
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // 完全な空行(セル1つだけの空文字列)は末尾改行等でできるノイズとして無視する
  return rows.filter((cells) => !(cells.length === 1 && cells[0] === ""));
}
