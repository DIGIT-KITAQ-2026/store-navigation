import { AdminHeader } from "@/components/ui/AdminHeader";
import ProductRegistrationFlow from "@/components/features/ProductRegistrationFlow";

export default function AdminProductsNewPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        title="商品登録"
        subtitle="棚バーコード・商品バーコードのスキャンから登録します"
        backHref="/admin"
        active="new"
        showLogout
      />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
        <ProductRegistrationFlow />
      </main>
    </div>
  );
}
