import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // スマホ等、同一LAN上の他端末から `npm run dev` にアクセスして動作確認するために許可する
  // オリジン一覧。開発者ごとにIPが変わるため、自分の端末で確認する場合は自分のLAN IPを
  // (`npm run dev` 起動時に表示される `Network: http://<IP>:3000` のIP部分) 追記する。
  allowedDevOrigins: ["192.168.1.7", "192.168.3.40", "127.0.0.1"],
};

export default nextConfig;
