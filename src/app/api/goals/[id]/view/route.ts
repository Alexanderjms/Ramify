import { auth } from "@/auth";
import { getDatabase, reportDatabaseError } from "@/lib/db";
import {
  loadGoalView,
  parseGoalView,
  saveGoalView,
  validGoalId,
} from "@/lib/goal-view";

const privateNoStore = { "Cache-Control": "private, no-store" };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateNoStore });
}

function matchesExpectedUser(request: Request, userId: string) {
  const expectedUserId = request.headers.get("X-Ramify-User-Id");
  return expectedUserId === null || expectedUserId === userId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  if (!matchesExpectedUser(request, session.user.id))
    return json({ error: "Forbidden" }, 403);
  const { id } = await params;
  if (!validGoalId(id)) return json({ error: "Invalid goal" }, 400);
  try {
    return json(await loadGoalView(getDatabase(), session.user.id, id));
  } catch (error) {
    reportDatabaseError("load-goal-view", error);
    return json({ error: "Could not load view" }, 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "Forbidden" }, 403);
  }
  const session = await auth();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  if (!matchesExpectedUser(request, session.user.id))
    return json({ error: "Forbidden" }, 403);
  const { id } = await params;
  if (!validGoalId(id)) return json({ error: "Invalid goal" }, 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Invalid view" }, 400);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 300000) {
      await reader.cancel();
      return json({ error: "Payload too large" }, 413);
    }
    chunks.push(value);
  }
  let view;
  try {
    view = parseGoalView(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return json({ error: "Invalid view" }, 400);
  }
  try {
    await saveGoalView(getDatabase(), session.user.id, id, view);
    return new Response(null, { status: 204, headers: privateNoStore });
  } catch (error) {
    reportDatabaseError("save-goal-view", error);
    return json({ error: "Could not save view" }, 500);
  }
}
