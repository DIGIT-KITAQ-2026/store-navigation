/** "123"のような0以上の整数のみを受け付ける(空文字・負数・小数・非数値はnull)。 */
export function parseNonNegativeInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

/** "123"や"123.45"のような0以上の数値のみを受け付ける(空文字・負数・非数値はnull)。 */
export function parseNonNegativeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

const DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * "YYYY-MM-DD"または"YYYY-MM-DD HH:mm[:ss]"("T"区切りも可)のみを受け付け、UTCとして解釈した
 * ISO文字列を返す(存在しない日付・時刻はnull)。counted_atはUTCとして保存する前提のため、
 * 実運用でJSTのつもりで入力する場合は時刻を明示して調整すること
 * (docs/棚卸しCSV仕様.md参照)。JSの緩いDate.parseに頼らず、年月日時分をUTC基準で組み立ててから
 * 桁あふれ(例: 2月30日)が無いか読み戻して確認する。
 */
export function parseCountedAt(raw: string): string | null {
  const trimmed = raw.trim();
  const match = DATE_TIME_PATTERN.exec(trimmed);
  if (!match) return null;

  const [, yearStr, monthStr, dayStr, hourStr = "00", minuteStr = "00", secondStr = "00"] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);

  const timestamp = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(timestamp);

  const isRealDateTime =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second;

  return isRealDateTime ? date.toISOString() : null;
}
