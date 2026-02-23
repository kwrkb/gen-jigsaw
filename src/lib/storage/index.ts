import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local-provider";

export function getStorageProvider(): StorageProvider {
  const providerName = process.env.STORAGE_PROVIDER ?? "local";

  switch (providerName) {
    case "local":
      return new LocalStorageProvider();
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER: ${providerName}. ` +
          `Supported: "local". For production, implement an S3/R2 provider.`
      );
  }
}

export type { StorageProvider };
