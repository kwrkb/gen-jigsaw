import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local-provider";

let cached: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;

  const providerName = process.env.STORAGE_PROVIDER ?? "local";

  switch (providerName) {
    case "local":
      cached = new LocalStorageProvider();
      break;
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER: ${providerName}. ` +
          `Supported: "local". For production, implement an S3/R2 provider.`
      );
  }
  return cached;
}

export type { StorageProvider };
