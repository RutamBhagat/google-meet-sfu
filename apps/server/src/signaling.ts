import { Elysia } from "elysia";
import type { Room } from "./mediasoup/room";
import {
  signalingMessageSchema,
  type SignalingMessage,
  type SignalingSocket,
} from "./signaling/messages";

const sockets = new Set<SignalingSocket>();

export function createSignalingPlugin(room: Room) {
  return new Elysia({ name: "signaling" }).ws("/ws", {
    open(ws) {
      const peer = {
        id: crypto.randomUUID(),
        transports: new Set<string>(),
        producers: new Set<string>(),
        consumers: new Set<string>(),
      };
      ws.raw.data.id = peer.id;
      room.peers.set(peer.id, peer);
      sockets.add(ws);
    },
    async message(ws, rawMessage) {
      const message = signalingMessageSchema.parse(
        typeof rawMessage === "string" ? JSON.parse(rawMessage) : rawMessage,
      );

      try {
        const data = await handleMessage(room, ws.raw.data.id!, message);
        ws.send(JSON.stringify({ id: message.id, ok: true, data }));
      } catch (error) {
        ws.send(
          JSON.stringify({
            id: message.id,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
    close(ws) {
      sockets.delete(ws);
      const peerId = ws.raw.data.id;
      if (!peerId) return;
      const peer = room.peers.get(peerId);
      if (!peer) return;

      for (const id of peer.transports) room.transports.get(id)?.close();
      for (const id of peer.producers) room.producers.delete(id);
      for (const id of peer.consumers) room.consumers.delete(id);
      room.peers.delete(peerId);
    },
  });
}

async function handleMessage(
  room: Room,
  peerId: string,
  message: SignalingMessage,
) {
  const peer = room.peers.get(peerId);
  if (!peer) throw new Error("unknown peer");

  switch (message.action) {
    case "getRouterRtpCapabilities":
      return room.router.rtpCapabilities;

    case "createWebRtcTransport": {
      const transport = await room.router.createWebRtcTransport({
        listenInfos: [
          { protocol: "udp", ip: "0.0.0.0", announcedAddress: "127.0.0.1" },
          { protocol: "tcp", ip: "0.0.0.0", announcedAddress: "127.0.0.1" },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        appData: { peerId, direction: message.direction },
      });

      room.transports.set(transport.id, transport);
      peer.transports.add(transport.id);
      transport.observer.once("close", () =>
        room.transports.delete(transport.id),
      );

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    }

    case "connectTransport": {
      const transport = room.transports.get(message.transportId);
      if (!transport) throw new Error("unknown transport");
      await transport.connect({ dtlsParameters: message.dtlsParameters });
      return null;
    }

    case "produce": {
      const transport = room.transports.get(message.transportId);
      if (!transport) throw new Error("unknown transport");
      const producer = await transport.produce({
        kind: message.kind,
        rtpParameters: message.rtpParameters,
        appData: { peerId, ...message.appData },
      });

      room.producers.set(producer.id, producer);
      peer.producers.add(producer.id);
      producer.observer.once("close", () => room.producers.delete(producer.id));
      broadcast(peerId, {
        action: "newProducer",
        producerId: producer.id,
        kind: producer.kind,
        appData: producer.appData,
      });
      return { id: producer.id };
    }

    case "consume": {
      if (
        !room.router.canConsume({
          producerId: message.producerId,
          rtpCapabilities: message.rtpCapabilities,
        })
      ) {
        throw new Error("cannot consume");
      }
      const transport = room.transports.get(message.transportId);
      if (!transport) throw new Error("unknown transport");
      const consumer = await transport.consume({
        producerId: message.producerId,
        rtpCapabilities: message.rtpCapabilities,
        paused: true,
      });

      room.consumers.set(consumer.id, consumer);
      peer.consumers.add(consumer.id);
      consumer.observer.once("close", () => room.consumers.delete(consumer.id));
      return {
        id: consumer.id,
        producerId: message.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    }

    case "resumeConsumer": {
      const consumer = room.consumers.get(message.consumerId);
      if (!consumer) throw new Error("unknown consumer");
      await consumer.resume();
      return null;
    }

    case "listProducers":
      return [...room.producers.values()]
        .filter((producer) => producer.appData.peerId !== peerId)
        .map((producer) => ({
          id: producer.id,
          kind: producer.kind,
          appData: producer.appData,
        }));
  }
}

function broadcast(exceptPeerId: string, message: unknown) {
  const body = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket.raw.data.id !== exceptPeerId) socket.send(body);
  }
}
