import { loadPublishedNewsById, parseNewsId } from "../service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ newsId: string }> },
) {
  const newsId = parseNewsId((await params).newsId);
  if (newsId === null) {
    return Response.json({ error: "잘못된 뉴스 ID입니다." }, { status: 400 });
  }

  try {
    const item = await loadPublishedNewsById(newsId);
    if (!item) return Response.json({ error: "뉴스를 찾지 못했습니다." }, { status: 404 });
    return Response.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "news_detail_lookup_failed",
        newsId,
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
    return Response.json({ error: "뉴스를 불러오지 못했습니다." }, { status: 503 });
  }
}
