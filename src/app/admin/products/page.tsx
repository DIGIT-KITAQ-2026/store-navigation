import { AdminHeader } from "@/components/ui/AdminHeader";
import { AdminProductListView } from "@/components/features/AdminProductListView";
import { getAdminProductList } from "@/lib/supabase/server";

export default async function AdminProductsPage() {
  const products = await getAdminProductList();

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        title="商品一覧"
        subtitle="登録済み商品の確認"
        backHref="/admin"
        active="products"
        showLogout
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-8 md:px-8">
        <AdminProductListView products={products} />
      </main>
    </div>
  );
}
