import SearchScreen from "@/components/features/SearchScreen";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return <SearchScreen initialQuery={q ?? ""} />;
}
