import { copyFileSync } from "fs";
import { join } from "path";
import { createId } from "@paralleldrive/cuid2";
import type { ImageGenProvider, GenerateInput, GenerateOutput } from "./provider";

export class MockImageGenProvider implements ImageGenProvider {
  async generate(_input: GenerateInput): Promise<GenerateOutput> {
    // 1〜2秒の遅延をシミュレート
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    const filename = `${createId()}.png`;
    const srcPath = join(process.cwd(), "public", "placeholder.png");
    const destPath = join(process.cwd(), "public", "generated", filename);

    copyFileSync(srcPath, destPath);

    return { imagePath: `/generated/${filename}` };
  }
}
