import { auth } from "@/auth";
import { getDatabase } from "@/lib/db";
import { parseGoalView, saveGoalView, validGoalId } from "@/lib/goal-view";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!validGoalId(id))
    return Response.json({ error: "Invalid goal" }, { status: 400 });
  // Bound the request body even if Content-Length is omitted or incorrect.
  let size = 0;
  const chunks: Uint8Array[] = [];
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Invalid view" }, { status: 400 });
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 300000) {
      await reader.cancel();
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    chunks.push(value);
  }
  let view;
  try {
    view = parseGoalView(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return Response.json({ error: "Invalid view" }, { status: 400 });
  }
  try {
    await saveGoalView(getDatabase(), session.user.id, id, view);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Could not save view" }, { status: 500 });
  }
}
