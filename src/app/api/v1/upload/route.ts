import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { uploadFile } from "@/lib/s3";
import { errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024;

function slugify(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function resolveFolder(orgId: string, projectId?: string, initiativeId?: string) {
  if (!projectId) return "misc";
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId },
    select: { name: true },
  });
  if (!project) return "misc";
  const projectSlug = slugify(project.name);
  if (!initiativeId) return projectSlug;
  const initiative = await prisma.initiative.findFirst({
    where: { id: initiativeId, projectId },
    select: { name: true },
  });
  if (!initiative) return projectSlug;
  return `${projectSlug}-${slugify(initiative.name)}`;
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return Response.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    if (!ALLOWED.has(file.type)) return Response.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "Arquivo muito grande (máx 10 MB)" }, { status: 400 });
    const projectId    = (form.get("projectId")    as string | null) ?? undefined;
    const initiativeId = (form.get("initiativeId") as string | null) ?? undefined;
    const folder = await resolveFolder(payload.organizationId, projectId, initiativeId);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const key = `${payload.organizationId}/${folder}/${randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(key, buf, file.type);
    return Response.json({ url });
  } catch (e) { return errorResponse(e); }
}
