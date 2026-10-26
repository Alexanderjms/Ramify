import { auth } from "@/auth";
import { getDatabase, reportDatabaseError } from "@/lib/db";
import {
  deleteGoalRecord,
  parseGoalFields,
  saveGoal,
} from "@/lib/goal-database";
import { validGoalId } from "@/lib/goal-view";

async function mutate(
  request: Request,
  params: Promise<{ id: string }>,
  deleting: boolean,
) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const expectedUser = request.headers.get("X-Ramify-User-Id");
  if (expectedUser && expectedUser !== session.user.id)
    return Response.json({ error: "Account changed" }, { status: 403 });
  const { id } = await params;
  if (!validGoalId(id))
    return Response.json({ error: "Invalid goal" }, { status: 400 });
  let fields;
  if (!deleting) {
    try {
      const reader = request.body?.getReader();
      if (!reader) throw new Error("Missing body");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16000) {
          await reader.cancel();
          return Response.json({ error: "Payload too large" }, { status: 413 });
        }
        chunks.push(value);
      }
      fields = parseGoalFields(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
    } catch {
      return Response.json({ error: "Invalid goal" }, { status: 400 });
    }
  }
  try {
    if (deleting) await deleteGoalRecord(getDatabase(), session.user.id, id);
    else await saveGoal(getDatabase(), session.user.id, id, fields);
    return new Response(null, { status: 204 });
  } catch (error) {
    reportDatabaseError(deleting ? "delete-goal" : "save-goal", error);
    return Response.json({ error: "Could not save goal" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return mutate(request, params, false);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return mutate(request, params, true);
}
