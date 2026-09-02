import { AdminHeader } from "@/components/ui/AdminHeader";
import ProductRegistrationFlow from "@/components/features/ProductRegistrationFlow";

export default function AdminProductsNewPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-surface-alt">
      <AdminHeader title="商品登録" backHref="/admin" showLogout />

      <main className="flex flex-1 flex-col gap-6 px-4 py-8">
        <ProductRegistrationFlow />
      </main>
    </div>
  );
}
