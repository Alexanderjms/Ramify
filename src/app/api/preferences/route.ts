import { auth } from "@/auth";
import { getDatabase, reportDatabaseError } from "@/lib/db";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "@/lib/preference-database";
import { readRequestBody, RequestBodyError } from "@/lib/request-body";
import { parsePreferencesPatch } from "@/lib/user-preferences";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const expectedUser = request.headers.get("X-Ramify-User-Id");
  if (expectedUser && expectedUser !== session.user.id)
    return Response.json({ error: "Account changed" }, { status: 403 });
  try {
    return Response.json(
      await loadUserPreferences(getDatabase(), session.user.id),
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    reportDatabaseError("load-preferences", error);
    return Response.json(
      { error: "Could not load preferences" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const expectedUser = request.headers.get("X-Ramify-User-Id");
  if (expectedUser && expectedUser !== session.user.id)
    return Response.json({ error: "Account changed" }, { status: 403 });
  let patch;
  try {
    patch = parsePreferencesPatch(
      JSON.parse((await readRequestBody(request, 4096)).toString("utf8")),
    );
  } catch (error) {
    return Response.json(
      { error: "Invalid preferences" },
      {
        status: error instanceof RequestBodyError ? error.status : 400,
      },
    );
  }
  try {
    await saveUserPreferences(getDatabase(), session.user.id, patch);
    return Response.json(
      await loadUserPreferences(getDatabase(), session.user.id),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    reportDatabaseError("save-preferences", error);
    return Response.json(
      { error: "Could not save preferences" },
      { status: 500 },
    );
  }
}
