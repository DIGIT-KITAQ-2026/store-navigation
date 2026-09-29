import assert from "node:assert/strict";
import test from "node:test";
import { callInferenceServer, getInferenceBaseUrls } from "./inferenceProxy";

const inferenceBaseUrl = process.env.AI_INFERENCE_BASE_URL;

function restoreInferenceBaseUrl() {
  if (inferenceBaseUrl === undefined) {
    delete process.env.AI_INFERENCE_BASE_URL;
  } else {
    process.env.AI_INFERENCE_BASE_URL = inferenceBaseUrl;
  }
}

test("getInferenceBaseUrls: カンマ区切りの待機系を正規化して返す", () => {
  try {
    process.env.AI_INFERENCE_BASE_URL = " https://primary.example.test/ , https://standby.example.test/// ";
    assert.deepEqual(getInferenceBaseUrls(), ["https://primary.example.test", "https://standby.example.test"]);
  } finally {
    restoreInferenceBaseUrl();
  }
});

test("callInferenceServer: 主系の通信失敗時は待機系へ切り替える", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  try {
    process.env.AI_INFERENCE_BASE_URL = "https://primary.example.test,https://standby.example.test";
    globalThis.fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith("https://primary.example.test")) {
        throw new TypeError("network unavailable");
      }
      return Response.json({ source: "standby" });
    };

    const result = await callInferenceServer<{ source: string }>("/api/internal/embed-text", { texts: ["test"] });

    assert.deepEqual(result, { source: "standby" });
    assert.deepEqual(calls, [
      "https://primary.example.test/api/internal/embed-text",
      "https://standby.example.test/api/internal/embed-text",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreInferenceBaseUrl();
  }
});
