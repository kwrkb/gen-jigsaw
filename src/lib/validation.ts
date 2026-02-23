import { z } from "zod";

export const DirectionSchema = z.enum(["N", "E", "S", "W"]);
export const ExpansionStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "DONE",
  "FAILED",
  "REJECTED",
  "ADOPTED",
]);

export const CreateUserSchema = z.object({
  displayName: z.string().min(1).max(50),
});

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  stylePreset: z.string().optional(),
});

export const AcquireLockSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
});

export const ReleaseLockSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
});

export const CreateExpansionSchema = z.object({
  fromTileId: z.string().min(1),
  targetX: z.number().int(),
  targetY: z.number().int(),
  direction: DirectionSchema,
  promptJson: z.object({
    text: z.string().min(1),
    style: z.string().optional(),
  }),
});

export const AdoptExpansionSchema = z.object({});

export const RunExpansionSchema = z.object({}).or(z.null()).optional();

export const RejectExpansionSchema = z.object({});
