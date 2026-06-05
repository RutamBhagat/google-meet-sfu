import type { types as MediasoupTypes } from "mediasoup";
import type { Room } from "../mediasoup/room";
import type { RtpPortPair } from "./config";

export async function createPlainConsumer(
  room: Room,
  producer: MediasoupTypes.Producer,
  ports: RtpPortPair,
) {
  const transport = await room.router.createPlainTransport({
    listenInfo: { protocol: "udp", ip: "127.0.0.1" },
    rtcpMux: false,
    comedia: false,
  });
  await transport.connect({
    ip: "127.0.0.1",
    port: ports.rtp,
    rtcpPort: ports.rtcp,
  });

  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities: room.router.rtpCapabilities,
    paused: true,
  });

  room.hls.transports.push(transport);
  room.hls.consumers.push(consumer);
  return { consumer };
}
