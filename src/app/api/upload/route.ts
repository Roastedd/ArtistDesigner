import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createPresignedUploadUrl,
  r2PublicUrl,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/r2";

export const runtime = "nodejs";

type UploadKind = "audio" | "image";

const ALLOWED: Record<UploadKind, readonly string[]> = {
  audio: ALLOWED_AUDIO_TYPES,
  image: ALLOWED_IMAGE_TYPES,
};

const MAX_BYTES: Record<UploadKind, number> = {
  audio: MAX_AUDIO_BYTES,
  image: MAX_IMAGE_BYTES,
};

/**
 * POST /api/upload
 * Body: { kind: "audio" | "image", contentType: string, contentLength: number, fileName: string }
 * Returns: { uploadUrl: string, publicUrl: string, key: string }
 *
 * The client uses uploadUrl (presigned PUT) to upload directly to R2,
 * then stores publicUrl in the DB.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { kind, contentType, contentLength, fileName } = body as {
    kind: unknown;
    contentType: unknown;
    contentLength: unknown;
    fileName: unknown;
  };

  // Validate kind
  if (kind !== "audio" && kind !== "image") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  // Validate contentType
  if (typeof contentType !== "string" || !ALLOWED[kind].includes(contentType)) {
    return NextResponse.json(
      { error: `Unsupported content type. Allowed: ${ALLOWED[kind].join(", ")}` },
      { status: 400 },
    );
  }

  // Validate contentLength
  if (
    typeof contentLength !== "number" ||
    contentLength <= 0 ||
    contentLength > MAX_BYTES[kind]
  ) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_BYTES[kind] / 1024 / 1024} MB` },
      { status: 400 },
    );
  }

  // Sanitize filename — strip path traversal, keep extension
  const rawName = typeof fileName === "string" ? fileName : "file";
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const ext = safeName.includes(".") ? safeName.split(".").pop()! : "";
  const key = `uploads/${session.user.id}/${kind}s/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  try {
    const [uploadUrl, publicUrl] = await Promise.all([
      createPresignedUploadUrl({ key, contentType, contentLength }),
      Promise.resolve(r2PublicUrl(key)),
    ]);
    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (e) {
    console.error("[upload] R2 error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload setup failed" },
      { status: 500 },
    );
  }
}
