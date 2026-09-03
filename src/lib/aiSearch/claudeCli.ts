import { spawn } from "node:child_process";

interface RunClaudeCliOptions {
  /** ミリ秒。超えたらプロセスをkillしてタイムアウトエラーにする */
  timeout: number;
}

/**
 * claude CLIをサブプロセスとして実行する共通処理。
 *
 * `child_process.execFile`だとstdinがパイプのまま繋がってしまい、claude CLI側が
 * 「パイプ入力が来るかもしれない」と数秒待つ("Warning: no stdin data received in 3s...")
 * 挙動が入り、その分タイムアウトに達しやすくなる問題があった。spawnでstdinを
 * 最初から閉じる(`stdio: ["ignore", ...]`)ことでこの待ち時間を無くす。
 */
export function runClaudeCli(args: string[], { timeout }: RunClaudeCliOptions): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      settled = true;
      child.kill();
      reject(new Error(`claude CLIがタイムアウトしました(${timeout}ms)`));
    }, timeout);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`claude CLIが終了コード${code}で失敗しました: ${stderr}`));
        return;
      }

      resolve({ stdout });
    });
  });
}
