import { EventEmitter } from "events";

/**
 * Process-local event emitter for SSE room notifications.
 *
 * Limitation: Events are scoped to a single Node.js process.
 * In multi-instance or serverless environments, events from one process
 * will not reach SSE clients connected to another process.
 * This is architecturally consistent with the SQLite single-server design.
 *
 * The client also polls via useRoom (3s interval) as a fallback,
 * so SSE is an optimization, not a requirement.
 *
 * Migration path: Replace with Redis Pub/Sub or an external realtime
 * service when moving away from SQLite to a multi-instance setup.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function roomEventKey(roomId: string) {
  return `room:${roomId}`;
}

export function emitRoomEvent(roomId: string, event: string) {
  emitter.emit(roomEventKey(roomId), event);
}

export function onRoomEvent(
  roomId: string,
  listener: (event: string) => void
): () => void {
  const key = roomEventKey(roomId);
  emitter.on(key, listener);
  return () => {
    emitter.off(key, listener);
  };
}
