import { renderUniverseScript } from "./service";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await renderUniverseScript(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
