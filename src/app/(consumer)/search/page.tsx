import SearchScreen from "@/components/features/SearchScreen";
import StoreFlowGuard from "@/components/features/StoreFlowGuard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <StoreFlowGuard>
      <SearchScreen initialQuery={q ?? ""} />
    </StoreFlowGuard>
  );
}
