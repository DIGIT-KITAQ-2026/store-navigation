import { AdminHeader } from "@/components/ui/AdminHeader";
import ProductDeletionFlow from "@/components/features/ProductDeletionFlow";

export default function AdminProductDeletePage() {
  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        title="商品削除"
        subtitle="棚バーコードから登録済み商品を選んで削除します"
        backHref="/admin"
        active="delete"
        showLogout
      />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
        <ProductDeletionFlow />
      </main>
    </div>
  );
}
