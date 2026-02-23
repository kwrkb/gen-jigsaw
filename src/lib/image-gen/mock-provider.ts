import { readFileSync } from "fs";
import { join } from "path";
import { createId } from "@paralleldrive/cuid2";
import { getStorageProvider } from "@/lib/storage";
import type { ImageGenProvider, GenerateInput, GenerateInitialInput, GenerateOutput } from "./provider";

export class MockImageGenProvider implements ImageGenProvider {
  private async mockGenerate(): Promise<GenerateOutput> {
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    const filename = `${createId()}.png`;
    const srcPath = join(process.cwd(), "public", "placeholder.png");
    const buffer = readFileSync(srcPath);

    const storage = getStorageProvider();
    const imagePath = await storage.upload(buffer, filename);

    return { imagePath };
  }

  async generate(_input: GenerateInput): Promise<GenerateOutput> {
    return this.mockGenerate();
  }

  async generateInitial(_input: GenerateInitialInput): Promise<GenerateOutput> {
    return this.mockGenerate();
  }
}
