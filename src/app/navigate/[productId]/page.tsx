export default async function NavigatePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return <div>Unity WebGLナビゲーション画面(商品ID: {productId})</div>;
}
