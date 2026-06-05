import * as mediasoup from "mediasoup";
import type { types as MediasoupTypes } from "mediasoup";
import { mediaCodecs } from "./codecs";

export type Peer = {
  id: string;
  transports: Set<string>;
  producers: Set<string>;
  consumers: Set<string>;
};

export type Room = {
  worker: MediasoupTypes.Worker;
  router: MediasoupTypes.Router;
  peers: Map<string, Peer>;
  transports: Map<string, MediasoupTypes.WebRtcTransport>;
  producers: Map<string, MediasoupTypes.Producer>;
  consumers: Map<string, MediasoupTypes.Consumer>;
};

export async function createRoom(): Promise<Room> {
  const worker = await mediasoup.createWorker({ logLevel: "warn" });

  worker.on("died", () => {
    console.error("mediasoup worker died; exiting");
    process.exit(1);
  });

  const router = await worker.createRouter({ mediaCodecs });

  return {
    worker,
    router,
    peers: new Map(),
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  };
}
