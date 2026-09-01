import ProductRegistrationFlow from "@/components/features/ProductRegistrationFlow";

export default function AdminProductsNewPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-bold text-on-surface">商品登録</h1>
      <ProductRegistrationFlow />
    </div>
  );
}
