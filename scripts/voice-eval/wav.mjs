/** 16kHz・モノラル・16bitのWAVを読み書きする。評価用スクリプト共通。 */
import { readFileSync, writeFileSync } from "node:fs";

/** WAVのdataチャンクを取り出して -1〜1 のFloat32Arrayにする */
export function readWav(path) {
  const buf = readFileSync(path);
  let offset = 12;
  while (offset < buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") {
      const count = size / 2;
      const out = new Float32Array(count);
      for (let i = 0; i < count; i++) out[i] = buf.readInt16LE(offset + 8 + i * 2) / 32768;
      return out;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`dataチャンクが見つからない: ${path}`);
}

/** /api/transcribe に送る生PCM(Int16)をそのまま取り出す */
export function readPcm(path) {
  const buf = readFileSync(path);
  let offset = 12;
  while (offset < buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") return buf.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  throw new Error(`dataチャンクが見つからない: ${path}`);
}

export function writeWav(path, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
    data.writeInt16LE(clamped, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(16000, 24);
  header.writeUInt32LE(32000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

/** 文字誤り率。表記の揺れではなく聞き取りの誤りを見たいので、記号と空白は落とす */
export function characterErrorRate(reference, hypothesis) {
  const clean = (s) => s.replace(/[\s、。,.!?！？「」]/g, "").normalize("NFKC");
  const a = [...clean(reference)];
  const b = [...clean(hypothesis)];
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length] / Math.max(a.length, 1);
}
