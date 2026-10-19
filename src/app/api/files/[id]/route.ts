import { auth } from "@/auth";
import { getDatabase } from "@/lib/db";
import {
  beginFile,
  completeFile,
  deleteUnusedFile,
  FileError,
  fileChunkSize,
  findFile,
  writeFileChunk,
} from "@/lib/file-database";
import { readRequestBody, RequestBodyError } from "@/lib/request-body";

async function handle(request: Request, params: Promise<{ id: string }>) {
  const reading = request.method === "GET" || request.method === "HEAD";
  if (!reading && request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  const userId = session.user.id;
  if (request.headers.get("X-Ramify-User-Id") !== userId)
    return new Response(null, { status: 403 });
  const { id } = await params;
  const client = getDatabase();
  try {
    if (reading) {
      const file = await findFile(client, userId, id);
      if (Number(file.ready) !== 1) throw new FileError(404);
      let part = 0;
      const count = Math.ceil(Number(file.size_bytes) / fileChunkSize);
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (part >= count) {
            controller.close();
            return;
          }
          try {
            const result = await client.execute({
              sql: "SELECT c.data FROM goal_file_chunks c JOIN goal_files f ON f.id = c.file_id WHERE c.file_id = ? AND c.part = ? AND f.user_id = ? AND f.ready = 1",
              args: [id, part++, userId],
            });
            if (!result.rows[0]) throw new FileError(404);
            controller.enqueue(
              new Uint8Array(result.rows[0].data as ArrayBuffer),
            );
          } catch (error) {
            controller.error(error);
          }
        },
      });
      const name = encodeURIComponent(String(file.file_name)).replace(
        /['()*]/g,
        (char) => `%${char.charCodeAt(0).toString(16)}`,
      );
      return new Response(request.method === "HEAD" ? null : stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(file.size_bytes),
          "Content-Disposition": `attachment; filename*=UTF-8''${name}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (request.method === "POST") {
      const body = await readRequestBody(request, 4096);
      let metadata;
      try {
        metadata = JSON.parse(body.toString("utf8"));
      } catch {
        throw new FileError(400);
      }
      return Response.json(await beginFile(client, userId, id, metadata));
    }
    if (request.method === "PUT") {
      const raw = new URL(request.url).searchParams.get("part");
      if (raw === null || !/^\d{1,2}$/.test(raw)) throw new FileError(400);
      await writeFileChunk(
        client,
        userId,
        id,
        Number(raw),
        await readRequestBody(request, fileChunkSize),
      );
    } else if (request.method === "PATCH") {
      await completeFile(client, userId, id);
    } else if (request.method === "DELETE") {
      await deleteUnusedFile(client, userId, id);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: "File operation failed" },
      {
        status:
          error instanceof FileError || error instanceof RequestBodyError
            ? error.status
            : 500,
      },
    );
  }
}

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return handle(request, params);
}
export async function HEAD(request: Request, { params }: Context) {
  return handle(request, params);
}
export async function POST(request: Request, { params }: Context) {
  return handle(request, params);
}
export async function PUT(request: Request, { params }: Context) {
  return handle(request, params);
}
export async function PATCH(request: Request, { params }: Context) {
  return handle(request, params);
}
export async function DELETE(request: Request, { params }: Context) {
  return handle(request, params);
}
