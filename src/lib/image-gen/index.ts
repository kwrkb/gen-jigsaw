import type { ImageGenProvider } from "./provider";
import { MockImageGenProvider } from "./mock-provider";
import { DallE2ImageGenProvider } from "./dalle2-provider";

export function getImageGenProvider(): ImageGenProvider {
  const providerName = process.env.IMAGE_GEN_PROVIDER ?? "mock";

  switch (providerName) {
    case "mock":
      return new MockImageGenProvider();
    case "dalle2":
      return new DallE2ImageGenProvider();
    default:
      throw new Error(`Unknown IMAGE_GEN_PROVIDER: ${providerName}`);
  }
}

export type { ImageGenProvider };
