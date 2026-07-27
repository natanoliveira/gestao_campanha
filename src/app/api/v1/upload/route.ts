import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { uploadFile } from "@/lib/s3";
import { errorResponse } from "@/lib/errors";
import { randomUUID } from "crypto";

const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return Response.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    if (!ALLOWED.has(file.type)) return Response.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "Arquivo muito grande (máx 10 MB)" }, { status: 400 });
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const key = `${payload.organizationId}/timeline/${randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(key, buf, file.type);
    return Response.json({ url });
  } catch (e) { return errorResponse(e); }
}
