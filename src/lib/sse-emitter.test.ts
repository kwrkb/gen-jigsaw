import { describe, it, expect, vi, afterEach } from 'vitest';
import { emitRoomEvent, onRoomEvent } from './sse-emitter';

describe('sse-emitter', () => {
  const cleanups: (() => void)[] = [];

  afterEach(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });

  it('should call the listener when a room event is emitted', () => {
    const roomId = 'room-1';
    const eventName = 'update';
    const listener = vi.fn();

    cleanups.push(onRoomEvent(roomId, listener));
    emitRoomEvent(roomId, eventName);

    expect(listener).toHaveBeenCalledWith(eventName);
  });

  it('should call multiple listeners for the same room', () => {
    const roomId = 'room-1';
    const eventName = 'update';
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    cleanups.push(onRoomEvent(roomId, listener1));
    cleanups.push(onRoomEvent(roomId, listener2));
    emitRoomEvent(roomId, eventName);

    expect(listener1).toHaveBeenCalledWith(eventName);
    expect(listener2).toHaveBeenCalledWith(eventName);
  });

  it('should not call listeners for a different room', () => {
    const roomId1 = 'room-1';
    const roomId2 = 'room-2';
    const eventName = 'update';
    const listener = vi.fn();

    cleanups.push(onRoomEvent(roomId1, listener));
    emitRoomEvent(roomId2, eventName);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should stop calling the listener after it is unregistered', () => {
    const roomId = 'room-1';
    const eventName = 'update';
    const listener = vi.fn();

    const unsubscribe = onRoomEvent(roomId, listener);
    unsubscribe();
    emitRoomEvent(roomId, eventName);

    expect(listener).not.toHaveBeenCalled();
  });
});
