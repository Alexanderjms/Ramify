import { auth } from "@/auth";
import { validResourceUrl } from "@/lib/goal-activities";
import { getLinkTitle } from "@/lib/link-title";
import { readRequestBody, RequestBodyError } from "@/lib/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("X-Ramify-User-Id") !== session.user.id)
    return Response.json({ error: "Account changed" }, { status: 403 });
  let url: unknown;
  try {
    url = JSON.parse(
      (await readRequestBody(request, 8192)).toString("utf8"),
    )?.url;
  } catch (error) {
    return Response.json(
      { error: "Invalid request" },
      {
        status: error instanceof RequestBodyError ? error.status : 400,
      },
    );
  }
  if (!validResourceUrl(url))
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  try {
    const title = await getLinkTitle(url);
    return Response.json(
      { title },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "Could not read title" }, { status: 422 });
  }
}
