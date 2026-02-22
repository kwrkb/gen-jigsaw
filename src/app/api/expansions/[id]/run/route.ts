import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict, notFound, serverError } from "@/lib/errors";
import { RunExpansionSchema } from "@/lib/validation";
import { getImageGenProvider } from "@/lib/image-gen";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = RunExpansionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const expansion = await prisma.expansion.findUnique({ where: { id } });
  if (!expansion) return notFound("Expansion not found");

  if (expansion.status !== "QUEUED") {
    return conflict(`Expansion is in status ${expansion.status}, expected QUEUED`);
  }

  // fromTile を取得
  const fromTile = await prisma.tile.findUnique({
    where: { id: expansion.fromTileId },
  });
  if (!fromTile) return notFound("Source tile not found");

  // RUNNING に変更
  await prisma.expansion.update({
    where: { id },
    data: { status: "RUNNING" },
  });

  try {
    const provider = getImageGenProvider();
    const promptJson = JSON.parse(expansion.promptJson);

    const result = await provider.generate({
      referenceImageUrl: fromTile.imageUrl,
      direction: expansion.direction as "N" | "E" | "S" | "W",
      prompt: promptJson,
      size: 256,
    });

    const updated = await prisma.expansion.update({
      where: { id },
      data: {
        status: "DONE",
        resultImageUrl: result.imagePath,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    await prisma.expansion.update({
      where: { id },
      data: { status: "QUEUED" },
    });
    console.error("Image generation failed:", err);
    return serverError("Image generation failed");
  }
}
