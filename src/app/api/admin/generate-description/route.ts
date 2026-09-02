import { generateProductDescription } from "@/lib/aiSearch/generateProductDescription";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();

  if (!name) {
    return Response.json({ error: "nameは必須です" }, { status: 400 });
  }

  try {
    const description = await generateProductDescription(name);
    return Response.json({ description });
  } catch (error) {
    console.error("[api/admin/generate-description] 説明文の生成に失敗しました", error);
    return Response.json({ error: "説明文の生成に失敗しました" }, { status: 500 });
  }
}
