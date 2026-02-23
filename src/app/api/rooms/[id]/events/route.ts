import { NextRequest } from "next/server";
import { onRoomEvent } from "@/lib/sse-emitter";

export const dynamic = "force-dynamic";

function formatSse(event: string, data: string) {
  return `event: ${event}\ndata: ${data}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(formatSse(event, data)));
      };

      send("ready", JSON.stringify({ roomId }));

      const unsubscribe = onRoomEvent(roomId, (eventName) => {
        send(eventName, JSON.stringify({ roomId }));
      });

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      const onAbort = () => {
        clearInterval(keepAlive);
        unsubscribe();
        controller.close();
      };

      req.signal.addEventListener("abort", onAbort, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
