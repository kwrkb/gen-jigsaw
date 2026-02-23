import { readFileSync } from "fs";
import { join } from "path";
import { createId } from "@paralleldrive/cuid2";
import { getStorageProvider } from "@/lib/storage";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import sharp from "sharp";
import type { Direction } from "@/types";
import type { GenerateInput, GenerateOutput, ImageGenProvider } from "./provider";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

function isRetryableStatus(status?: number): boolean {
  return status === 429 || (status !== undefined && status >= 500);
}

function getRetryStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const maybeStatus = (error as { status?: unknown }).status;
  return typeof maybeStatus === "number" ? maybeStatus : undefined;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadReferenceImage(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch reference image: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const trimmed = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
  return readFileSync(join(process.cwd(), "public", trimmed));
}

function createMaskBuffer(size: number, direction: Direction): Buffer {
  const channels = 4;
  const data = Buffer.alloc(size * size * channels, 255);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * channels;
      let shouldEdit = false;

      // 透明部分（AIが生成する）は新タイルと接しない辺側。
      // 保持部分（不透明）は元タイルの境界辺側として残し、AIの継ぎ目生成に利用する。
      if (direction === "E") shouldEdit = x < size / 2;
      if (direction === "W") shouldEdit = x >= size / 2;
      if (direction === "S") shouldEdit = y < size / 2;
      if (direction === "N") shouldEdit = y >= size / 2;

      if (shouldEdit) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
      }
    }
  }

  return data;
}

function buildPrompt(input: GenerateInput): string {
  const style = input.prompt.style ? ` (${input.prompt.style} style)` : "";
  return `${input.prompt.text}${style}`;
}

export class DallE2ImageGenProvider implements ImageGenProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    this.client = new OpenAI({ apiKey });
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const referenceImageBuffer = await loadReferenceImage(input.referenceImageUrl);
    const size: 256 | 512 = input.size <= 256 ? 256 : 512;

    const referenceBuffer = await sharp(referenceImageBuffer)
      .resize(size, size, { fit: "cover" })
      .ensureAlpha()
      .png()
      .toBuffer();

    const maskRawBuffer = createMaskBuffer(size, input.direction);
    const maskBuffer = await sharp(maskRawBuffer, {
      raw: { width: size, height: size, channels: 4 },
    })
      .png()
      .toBuffer();

    const prompt = buildPrompt(input);

    let imageUrl: string | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const edited = await this.client.images.edit({
          model: "dall-e-2",
          image: await toFile(referenceBuffer, "reference.png", {
            type: "image/png",
          }),
          mask: await toFile(maskBuffer, "mask.png", { type: "image/png" }),
          prompt,
          n: 1,
          size: `${size}x${size}` as "256x256" | "512x512",
        });
        imageUrl = edited.data?.[0]?.url;
        if (!imageUrl) {
          throw new Error("DALL-E response did not contain an image URL");
        }
        break;
      } catch (error) {
        lastError = error;
        const status = getRetryStatus(error);
        if (attempt === MAX_RETRIES - 1 || !isRetryableStatus(status)) {
          throw error;
        }
        const backoff = BASE_BACKOFF_MS * 2 ** attempt;
        await sleep(backoff);
      }
    }

    if (!imageUrl) {
      throw lastError instanceof Error
        ? lastError
        : new Error("Failed to generate image");
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download generated image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const filename = `${createId()}.png`;

    const storage = getStorageProvider();
    const imagePath = await storage.upload(Buffer.from(arrayBuffer), filename);

    return { imagePath };
  }
}
