import type { PromptJson, Direction } from "@/types";

export interface GenerateInput {
  referenceImageUrl: string;
  direction: Direction;
  prompt: PromptJson;
  size: number;
}

export interface GenerateOutput {
  imagePath: string;
}

export interface ImageGenProvider {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}
