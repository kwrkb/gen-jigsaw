import { EventEmitter } from "events";

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
