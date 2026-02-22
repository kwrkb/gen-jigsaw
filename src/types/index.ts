export type Direction = "N" | "E" | "S" | "W";
export type ExpansionStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "REJECTED" | "ADOPTED";

export interface User {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  ownerUserId: string;
  stylePreset?: string | null;
  createdAt: string;
}

export interface Tile {
  id: string;
  roomId: string;
  x: number;
  y: number;
  imageUrl: string;
  createdByUserId: string;
  createdAt: string;
}

export interface Expansion {
  id: string;
  roomId: string;
  fromTileId: string;
  targetX: number;
  targetY: number;
  direction: Direction;
  promptJson: string;
  status: ExpansionStatus;
  resultImageUrl?: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface Lock {
  id: string;
  roomId: string;
  x: number;
  y: number;
  lockedByUserId: string;
  expiresAt: string;
  createdAt: string;
}

export interface RoomDetail extends Room {
  tiles: Tile[];
  expansions: Expansion[];
  locks: Lock[];
}

export interface PromptJson {
  text: string;
  style?: string;
}
