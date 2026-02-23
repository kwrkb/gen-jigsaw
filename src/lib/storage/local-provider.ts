import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { StorageProvider } from "./provider";

/**
 * Stores files under public/generated/ for local development.
 * NOT suitable for serverless/multi-instance deployments.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly dir: string;

  constructor() {
    this.dir = join(process.cwd(), "public", "generated");
    mkdirSync(this.dir, { recursive: true });
  }

  async upload(buffer: Buffer, filename: string): Promise<string> {
    writeFileSync(join(this.dir, filename), buffer);
    return `/generated/${filename}`;
  }
}
