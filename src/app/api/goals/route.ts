import { auth } from "@/auth";
import { getDatabase, reportDatabaseError } from "@/lib/db";
import { listGoals } from "@/lib/goal-database";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const expectedUser = request.headers.get("X-Ramify-User-Id");
  if (expectedUser && expectedUser !== session.user.id)
    return Response.json({ error: "Account changed" }, { status: 403 });
  try {
    return Response.json(await listGoals(getDatabase(), session.user.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    reportDatabaseError("load-goals", error);
    return Response.json({ error: "Could not load goals" }, { status: 500 });
  }
}
