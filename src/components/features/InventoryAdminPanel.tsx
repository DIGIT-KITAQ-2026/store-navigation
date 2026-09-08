"use client";

import { useState } from "react";
import InventoryImportFlow from "@/components/features/InventoryImportFlow";
import InventoryHistoryList from "@/components/features/InventoryHistoryList";

/**
 * 棚卸CSV取込画面(/admin/inventory)の中身。取込フローと履歴一覧を並べ、
 * 確定取込成功時にrefreshTokenを更新して履歴一覧だけを再取得させる
 * (ページ全体のリロードはしない)。
 */
export default function InventoryAdminPanel() {
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <InventoryImportFlow onImportSuccess={() => setHistoryRefreshToken((token) => token + 1)} />
      <InventoryHistoryList refreshToken={historyRefreshToken} />
    </div>
  );
}
