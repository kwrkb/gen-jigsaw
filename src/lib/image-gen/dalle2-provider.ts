import { readFileSync } from "fs";
import { join, resolve, relative, isAbsolute } from "path";
import { createId } from "@paralleldrive/cuid2";
import { getStorageProvider } from "@/lib/storage";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import sharp from "sharp";
import type { Direction } from "@/types";
import type { GenerateInput, GenerateInitialInput, GenerateOutput, ImageGenProvider } from "./provider";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

/** コンポジットキャンバスのレイアウト定数 */
const COMPOSITE_SIZE = 512;
const TILE_SIZE = 256;
const STRIP_WIDTH = 128;

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

export async function loadReferenceImage(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch reference image: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const trimmed = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
  const publicDir = join(process.cwd(), "public");
  const targetPath = resolve(publicDir, trimmed);

  const rel = relative(publicDir, targetPath);
  if (rel.startsWith("..") || isAbsolute(rel) || rel === "") {
    throw new Error("Invalid reference image URL");
  }

  return readFileSync(targetPath);
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

/**
 * コンポジットキャンバス用マスクを生成。
 * 隣接タイルのエッジストリップ部分 = 不透明（保持）、中央+空き = 透過（AI生成）。
 */
function createCompositeMaskBuffer(
  adjacentImages: Partial<Record<Direction, string>>
): Buffer {
  const channels = 4;
  // 全体を透明（AI生成対象）で初期化
  const data = Buffer.alloc(COMPOSITE_SIZE * COMPOSITE_SIZE * channels, 0);

  for (let y = 0; y < COMPOSITE_SIZE; y++) {
    for (let x = 0; x < COMPOSITE_SIZE; x++) {
      const offset = (y * COMPOSITE_SIZE + x) * channels;
      let shouldPreserve = false;

      // 上端ストリップ (N): y=[0, STRIP_WIDTH), x=[STRIP_WIDTH, STRIP_WIDTH+TILE_SIZE)
      if (
        adjacentImages.N &&
        y < STRIP_WIDTH &&
        x >= STRIP_WIDTH &&
        x < STRIP_WIDTH + TILE_SIZE
      ) {
        shouldPreserve = true;
      }

      // 下端ストリップ (S): y=[STRIP_WIDTH+TILE_SIZE, COMPOSITE_SIZE), x=[STRIP_WIDTH, STRIP_WIDTH+TILE_SIZE)
      if (
        adjacentImages.S &&
        y >= STRIP_WIDTH + TILE_SIZE &&
        x >= STRIP_WIDTH &&
        x < STRIP_WIDTH + TILE_SIZE
      ) {
        shouldPreserve = true;
      }

      // 左端ストリップ (W): x=[0, STRIP_WIDTH), y=[STRIP_WIDTH, STRIP_WIDTH+TILE_SIZE)
      if (
        adjacentImages.W &&
        x < STRIP_WIDTH &&
        y >= STRIP_WIDTH &&
        y < STRIP_WIDTH + TILE_SIZE
      ) {
        shouldPreserve = true;
      }

      // 右端ストリップ (E): x=[STRIP_WIDTH+TILE_SIZE, COMPOSITE_SIZE), y=[STRIP_WIDTH, STRIP_WIDTH+TILE_SIZE)
      if (
        adjacentImages.E &&
        x >= STRIP_WIDTH + TILE_SIZE &&
        y >= STRIP_WIDTH &&
        y < STRIP_WIDTH + TILE_SIZE
      ) {
        shouldPreserve = true;
      }

      if (shouldPreserve) {
        // 不透明 = 保持
        data[offset] = 255;
        data[offset + 1] = 255;
        data[offset + 2] = 255;
        data[offset + 3] = 255;
      }
    }
  }

  return data;
}

/**
 * 隣接タイルのエッジストリップを 512x512 キャンバスに配置する。
 *
 * レイアウト:
 * +--------+------------------+--------+
 * | (empty)| N隣接の下端128px  | (empty)|  128px
 * +--------+------------------+--------+
 * | W隣接  |                  | E隣接  |
 * | 右端   |  中央 256x256    | 左端   |  256px
 * | 128px  |  (生成対象)      | 128px  |
 * +--------+------------------+--------+
 * | (empty)| S隣接の上端128px  | (empty)|  128px
 * +--------+------------------+--------+
 *   128px       256px           128px
 */
async function composeReferenceCanvas(
  adjacentImages: Partial<Record<Direction, string>>
): Promise<{ referenceBuffer: Buffer; maskBuffer: Buffer }> {
  // 各方向の画像を並列ロード
  const directions: Direction[] = ["N", "S", "E", "W"];
  const loadedImages: Partial<Record<Direction, Buffer>> = {};

  await Promise.all(
    directions.map(async (dir) => {
      const url = adjacentImages[dir];
      if (!url) return;
      const buf = await loadReferenceImage(url);
      loadedImages[dir] = await sharp(buf)
        .resize(TILE_SIZE, TILE_SIZE, { fit: "cover" })
        .ensureAlpha()
        .png()
        .toBuffer();
    })
  );

  // エッジストリップを抽出してキャンバスに配置
  const compositeInputs: sharp.OverlayOptions[] = [];

  // N: 隣接タイルの下端 128px → キャンバス上端
  if (loadedImages.N) {
    const strip = await sharp(loadedImages.N)
      .extract({ left: 0, top: TILE_SIZE - STRIP_WIDTH, width: TILE_SIZE, height: STRIP_WIDTH })
      .toBuffer();
    compositeInputs.push({ input: strip, left: STRIP_WIDTH, top: 0 });
  }

  // S: 隣接タイルの上端 128px → キャンバス下端
  if (loadedImages.S) {
    const strip = await sharp(loadedImages.S)
      .extract({ left: 0, top: 0, width: TILE_SIZE, height: STRIP_WIDTH })
      .toBuffer();
    compositeInputs.push({ input: strip, left: STRIP_WIDTH, top: STRIP_WIDTH + TILE_SIZE });
  }

  // W: 隣接タイルの右端 128px → キャンバス左端
  if (loadedImages.W) {
    const strip = await sharp(loadedImages.W)
      .extract({ left: TILE_SIZE - STRIP_WIDTH, top: 0, width: STRIP_WIDTH, height: TILE_SIZE })
      .toBuffer();
    compositeInputs.push({ input: strip, left: 0, top: STRIP_WIDTH });
  }

  // E: 隣接タイルの左端 128px → キャンバス右端
  if (loadedImages.E) {
    const strip = await sharp(loadedImages.E)
      .extract({ left: 0, top: 0, width: STRIP_WIDTH, height: TILE_SIZE })
      .toBuffer();
    compositeInputs.push({ input: strip, left: STRIP_WIDTH + TILE_SIZE, top: STRIP_WIDTH });
  }

  // 512x512 透明キャンバスにストリップを合成
  const referenceBuffer = await sharp({
    create: {
      width: COMPOSITE_SIZE,
      height: COMPOSITE_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();

  // マスク生成
  const maskRaw = createCompositeMaskBuffer(adjacentImages);
  const maskBuffer = await sharp(maskRaw, {
    raw: { width: COMPOSITE_SIZE, height: COMPOSITE_SIZE, channels: 4 },
  })
    .png()
    .toBuffer();

  return { referenceBuffer, maskBuffer };
}

/** ユーザー入力のサニタイズ: 制御文字除去 + 長さ制限 */
function sanitizePromptText(text: string, maxLen = 400): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x1f\x7f]/g, " ").trim().slice(0, maxLen);
}

function buildPrompt(input: { prompt: { text: string; style?: string } }): string {
  const text = sanitizePromptText(input.prompt.text);
  const style = input.prompt.style
    ? ` (${sanitizePromptText(input.prompt.style, 100)} style)`
    : "";
  return `${text}${style}`;
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

  /** API呼び出しをリトライ付きで実行し、生成画像URLを返す */
  private async callApiWithRetry(
    apiCall: () => Promise<string | undefined>
  ): Promise<string> {
    let imageUrl: string | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        imageUrl = await apiCall();
        if (!imageUrl) {
          throw new Error("DALL-E response did not contain an image URL");
        }
        return imageUrl;
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

    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to generate image");
  }

  /** 生成画像URLをダウンロードしてストレージにアップロード */
  private async downloadAndUpload(
    generatedUrl: string,
    cropRegion?: { left: number; top: number; width: number; height: number }
  ): Promise<GenerateOutput> {
    const response = await fetch(generatedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download generated image: ${response.status}`);
    }

    const downloadedBuffer = Buffer.from(await response.arrayBuffer());

    const finalBuffer = cropRegion
      ? await sharp(downloadedBuffer).extract(cropRegion).png().toBuffer()
      : downloadedBuffer;

    const filename = `${createId()}.png`;
    const storage = getStorageProvider();
    const imagePath = await storage.upload(finalBuffer, filename);

    return { imagePath };
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const hasAdjacentImages =
      input.adjacentImages && Object.keys(input.adjacentImages).length > 0;

    if (hasAdjacentImages) {
      return this.generateWithComposite(input);
    }
    return this.generateLegacy(input);
  }

  /** コンポジットキャンバス方式: 隣接タイルのエッジを参照して生成 */
  private async generateWithComposite(input: GenerateInput): Promise<GenerateOutput> {
    const { referenceBuffer, maskBuffer } = await composeReferenceCanvas(
      input.adjacentImages!
    );

    const prompt = buildPrompt(input);

    const generatedUrl = await this.callApiWithRetry(async () => {
      const edited = await this.client.images.edit({
        model: "dall-e-2",
        image: await toFile(referenceBuffer, "reference.png", {
          type: "image/png",
        }),
        mask: await toFile(maskBuffer, "mask.png", { type: "image/png" }),
        prompt,
        n: 1,
        size: `${COMPOSITE_SIZE}x${COMPOSITE_SIZE}` as "512x512",
      });
      return edited.data?.[0]?.url;
    });

    // 中央 256x256 をクロップして新タイルとする
    return this.downloadAndUpload(generatedUrl, {
      left: STRIP_WIDTH,
      top: STRIP_WIDTH,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  /** 従来方式: fromTile のみ参照（後方互換フォールバック） */
  private async generateLegacy(input: GenerateInput): Promise<GenerateOutput> {
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

    const generatedUrl = await this.callApiWithRetry(async () => {
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
      return edited.data?.[0]?.url;
    });

    return this.downloadAndUpload(generatedUrl);
  }

  async generateInitial(input: GenerateInitialInput): Promise<GenerateOutput> {
    const size: 256 | 512 = input.size <= 256 ? 256 : 512;
    const prompt = buildPrompt(input);

    const generatedUrl = await this.callApiWithRetry(async () => {
      const result = await this.client.images.generate({
        model: "dall-e-2",
        prompt,
        n: 1,
        size: `${size}x${size}` as "256x256" | "512x512",
      });
      return result.data?.[0]?.url;
    });

    return this.downloadAndUpload(generatedUrl);
  }
}
