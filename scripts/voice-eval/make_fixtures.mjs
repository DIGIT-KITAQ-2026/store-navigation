/**
 * 評価用の音声を作る。macOSの `say` で phrases.json を読み上げ、16kHz・モノラルのWAVにする。
 *
 * 人が吹き込んだ音声のほうが実態には近いが、誰でも同じ音声を再現できることを優先している。
 * 話者を3人使うのは、1人の声質にたまたま強い/弱いモデルを掴まないため。
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { platform } from "node:os";

if (platform() !== "darwin") {
  console.error("`say` を使うのでmacOSでのみ動く。作った audio/ を共有すれば他のOSでも評価はできる。");
  process.exit(1);
}

const VOICES = ["Kyoko", "Reed", "Sandy"];
const phrases = JSON.parse(readFileSync("phrases.json", "utf8"));

rmSync("audio/clean", { recursive: true, force: true });
mkdirSync("audio/clean", { recursive: true });

const manifest = [];
for (const phrase of phrases) {
  for (const voice of VOICES) {
    const file = `audio/clean/${phrase.key}_${voice}.wav`;
    const temp = `${file}.aiff`;
    execFileSync("say", ["-v", voice, "-o", temp, phrase.text]);
    // Whisperに渡すのと同じ 16kHz・モノラル・16bit に揃える
    execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@16000", "-c", "1", temp, file]);
    rmSync(temp);
    manifest.push({ file, key: phrase.key, text: phrase.text, voice, expect: phrase.expect });
  }
}
writeFileSync("audio/manifest.json", JSON.stringify(manifest, null, 1));
console.log(`評価用音声を生成: ${manifest.length}本 (${phrases.length}フレーズ × ${VOICES.length}話者)`);
