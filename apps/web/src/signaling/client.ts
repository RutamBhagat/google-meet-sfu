import { z } from "zod";
import { newProducerSchema, wsResponseSchema, type ProducerInfo } from "./schemas";

export class Signaling {
  private nextId = 1;
  private pending = new Map<string, { resolve: (data: unknown) => void; reject: (error: Error) => void }>();
  private readonly socket: WebSocket;
  onProducer?: (producer: ProducerInfo) => void;

  constructor(url: string) {
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event) => this.handleMessage(event.data);
  }

  ready() {
    if (this.socket.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.socket.onopen = () => resolve();
    });
  }

  request<T>(payload: Record<string, unknown>, schema: z.ZodType<T>) {
    const id = String(this.nextId++);
    this.socket.send(JSON.stringify({ id, ...payload }));
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (data) => resolve(schema.parse(data)), reject });
    });
  }

  close() {
    this.socket.close();
  }

  private handleMessage(data: unknown) {
    const raw = JSON.parse(z.string().parse(data));
    const response = wsResponseSchema.safeParse(raw);
    if (response.success) {
      const message = response.data;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.ok) pending.resolve(message.data);
      else pending.reject(new Error(message.error));
      return;
    }

    const notification = newProducerSchema.parse(raw);
    this.onProducer?.({
      id: notification.producerId,
      kind: notification.kind,
      appData: notification.appData,
    });
  }
}
