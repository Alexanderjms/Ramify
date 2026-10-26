import { auth } from "@/auth";
import { getDatabase, reportDatabaseError } from "@/lib/db";
import { ActivityError, saveActivities } from "@/lib/activity-database";
import { validGoalId } from "@/lib/goal-view";
import { readRequestBody, RequestBodyError } from "@/lib/request-body";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
  try {
    let body;
    try {
      body = JSON.parse(
        (await readRequestBody(request, 4 * 1024 * 1024)).toString("utf8"),
      );
    } catch (error) {
      if (error instanceof RequestBodyError) throw error;
      throw new ActivityError(400);
    }
    if (!body || typeof body !== "object") throw new ActivityError(400);
    const version = await saveActivities(
      getDatabase(),
      session.user.id,
      id,
      body.activities,
      body.version,
      body.goal,
    );
    return Response.json(
      { version },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (!(error instanceof ActivityError || error instanceof RequestBodyError))
      reportDatabaseError("save-activities", error);
    return Response.json(
      { error: "Could not save diagram" },
      {
        status:
          error instanceof ActivityError || error instanceof RequestBodyError
            ? error.status
            : 500,
      },
    );
  }
}
