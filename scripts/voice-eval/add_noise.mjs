/**
 * 店内の環境音を想定した雑音を重ねる。
 *
 * 実店舗の録音が用意できないので合成している。
 *
 * 乱数に種を与えて、何度作り直しても同じ雑音になるようにしてある。
 * Math.randomのままだと作り直すたびに雑音が変わり、前後比較にならない
 * (実際、同じモデルで作り直しただけで商品到達が 31/45 と 34/45 に振れた)。
 */
import { readdirSync, mkdirSync } from "node:fs";
import { readWav, writeWav } from "./wav.mjs";

/** 種を与えて再現できる乱数(mulberry32)。0〜1を返す */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 低い定常音(空調)+ ざわめき + ときどきの物音 */
function storeNoise(length, random) {
  const noise = new Float32Array(length);
  let hum = 0;
  let murmur = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    hum = hum * 0.95 + white * 0.05;
    murmur = murmur * 0.7 + white * 0.3;
    let value = hum * 1.6 + murmur * 0.5;
    if (random() < 0.0004) value += (random() * 2 - 1) * 2.5;
    noise[i] = value;
  }
  return noise;
}

const rms = (values) => Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length);

const SNRS = [20, 10, 5];
mkdirSync("audio/noisy", { recursive: true });

let count = 0;
let seed = 1;
for (const name of readdirSync("audio/clean").filter((f) => f.endsWith(".wav")).sort()) {
  const speech = readWav(`audio/clean/${name}`);
  for (const snr of SNRS) {
    const noise = storeNoise(speech.length, seededRandom(seed++));
    const scale = rms(speech) / rms(noise) / Math.pow(10, snr / 20);
    const mixed = new Float32Array(speech.length);
    for (let i = 0; i < speech.length; i++) mixed[i] = speech[i] + noise[i] * scale;
    let peak = 0;
    for (const value of mixed) peak = Math.max(peak, Math.abs(value));
    if (peak > 1) for (let i = 0; i < mixed.length; i++) mixed[i] /= peak;
    writeWav(`audio/noisy/${name.replace(".wav", "")}_snr${snr}.wav`, mixed);
    count++;
  }
}
console.log(`雑音入り音声を生成: ${count}本 (SNR ${SNRS.join("/")}dB)`);
