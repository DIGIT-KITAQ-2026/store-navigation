import { AdminHeader } from "@/components/ui/AdminHeader";
import ProductDeletionFlow from "@/components/features/ProductDeletionFlow";

export default function AdminProductDeletePage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-surface-alt">
      <AdminHeader title="商品削除" backHref="/admin" showLogout />

      <main className="flex flex-1 flex-col gap-6 px-4 py-8">
        <ProductDeletionFlow />
      </main>
    </div>
  );
}
