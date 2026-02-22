import type { ImageGenProvider } from "./provider";
import { MockImageGenProvider } from "./mock-provider";

export function getImageGenProvider(): ImageGenProvider {
  const providerName = process.env.IMAGE_GEN_PROVIDER ?? "mock";

  switch (providerName) {
    case "mock":
      return new MockImageGenProvider();
    default:
      throw new Error(`Unknown IMAGE_GEN_PROVIDER: ${providerName}`);
  }
}

export type { ImageGenProvider };
