import { AdminHeader } from "@/components/ui/AdminHeader";
import { AdminProductListView } from "@/components/features/AdminProductListView";
import { getAdminProductList } from "@/lib/supabase/server";

export default async function AdminProductsPage() {
  const products = await getAdminProductList();

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-surface-alt">
      <AdminHeader title="商品一覧" backHref="/admin" showLogout />

      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <AdminProductListView products={products} />
      </main>
    </div>
  );
}
