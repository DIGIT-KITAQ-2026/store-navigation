import { AdminHeader } from "@/components/ui/AdminHeader";

export default function AdminProductNewPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-surface-alt">
      <AdminHeader title="商品登録" backHref="/admin" showLogout />

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <p className="text-[15px] leading-[1.6] text-text-secondary">
          準備中の画面です。
        </p>
      </main>
    </div>
  );
}
