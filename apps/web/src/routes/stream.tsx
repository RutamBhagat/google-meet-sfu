import { useEffect, useMemo, useState } from "react";
import { Device } from "mediasoup-client";
import type { types as MediasoupTypes } from "mediasoup-client";
import { createFileRoute } from "@tanstack/react-router";

import { StreamView } from "@/components/stream/stream-view";
import { Signaling } from "@/signaling/client";
import {
  consumeResponseSchema,
  nullResponseSchema,
  producerListSchema,
  produceResponseSchema,
  rtpCapabilitiesSchema,
  transportOptionsSchema,
  type ProducerInfo,
} from "@/signaling/schemas";

export const Route = createFileRoute("/stream")({
  component: StreamRoute,
});

function StreamRoute() {
  const [status, setStatus] = useState("joining room");
  const [localStream, setLocalStream] = useState<MediaStream>();
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [error, setError] = useState<string>();

  const streams = useMemo(() => [...remoteStreams.entries()], [remoteStreams]);

  useEffect(() => {
    let closed = false;
    const signaling = new Signaling("ws://localhost:3000/ws");
    let local: MediaStream | undefined;
    let sendTransport: MediasoupTypes.Transport | undefined;
    let recvTransport: MediasoupTypes.Transport | undefined;
    const consumed = new Set<string>();

    async function run() {
      await signaling.ready();
      if (closed) return;

      const device = new Device();
      const routerRtpCapabilities = await signaling.request(
        { action: "getRouterRtpCapabilities" },
        rtpCapabilitiesSchema,
      );
      await device.load({ routerRtpCapabilities });

      local = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (closed) return;
      setLocalStream(local);

      const sendOptions = await signaling.request(
        { action: "createWebRtcTransport", direction: "send" },
        transportOptionsSchema,
      );
      const currentSendTransport = device.createSendTransport(sendOptions);
      sendTransport = currentSendTransport;
      currentSendTransport.on(
        "connect",
        ({ dtlsParameters }, callback, errback) => {
          signaling
            .request(
              {
                action: "connectTransport",
                transportId: currentSendTransport.id,
                dtlsParameters,
              },
              nullResponseSchema,
            )
            .then(() => callback())
            .catch(errback);
        },
      );
      currentSendTransport.on(
        "produce",
        ({ kind, rtpParameters, appData }, callback, errback) => {
          signaling
            .request(
              {
                action: "produce",
                transportId: currentSendTransport.id,
                kind,
                rtpParameters,
                appData,
              },
              produceResponseSchema,
            )
            .then(({ id }) => callback({ id }))
            .catch(errback);
        },
      );

      for (const track of local.getTracks()) {
        await currentSendTransport.produce({
          track,
          appData: { source: track.kind },
        });
      }

      async function getRecvTransport() {
        if (recvTransport) return recvTransport;
        const recvOptions = await signaling.request(
          { action: "createWebRtcTransport", direction: "recv" },
          transportOptionsSchema,
        );
        const currentRecvTransport = device.createRecvTransport(recvOptions);
        recvTransport = currentRecvTransport;
        currentRecvTransport.on(
          "connect",
          ({ dtlsParameters }, callback, errback) => {
            signaling
              .request(
                {
                  action: "connectTransport",
                  transportId: currentRecvTransport.id,
                  dtlsParameters,
                },
                nullResponseSchema,
              )
              .then(() => callback())
              .catch(errback);
          },
        );
        return currentRecvTransport;
      }

      async function consume(producer: ProducerInfo) {
        if (closed || consumed.has(producer.id) || producer.appData?.program)
          return;
        consumed.add(producer.id);
        const transport = await getRecvTransport();
        const data = await signaling.request(
          {
            action: "consume",
            transportId: transport.id,
            producerId: producer.id,
            rtpCapabilities: device.recvRtpCapabilities,
          },
          consumeResponseSchema,
        );
        const consumer = await transport.consume(data);
        const peerId = producer.appData?.peerId ?? producer.id;
        setRemoteStreams((current) => {
          const next = new Map(current);
          const stream = next.get(peerId) ?? new MediaStream();
          stream.addTrack(consumer.track);
          next.set(peerId, stream);
          return next;
        });
        await signaling.request(
          { action: "resumeConsumer", consumerId: consumer.id },
          nullResponseSchema,
        );
      }

      signaling.onProducer = consume;
      const producers = await signaling.request(
        { action: "listProducers" },
        producerListSchema,
      );
      await Promise.all(producers.map(consume));
      setStatus("connected");
    }

    run().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason));
      setStatus("failed");
    });

    return () => {
      closed = true;
      local?.getTracks().forEach((track) => track.stop());
      sendTransport?.close();
      recvTransport?.close();
      signaling.close();
    };
  }, []);

  return (
    <StreamView
      status={status}
      error={error}
      localStream={localStream}
      remoteStream={streams[0]?.[1]}
      onRejoin={() => window.location.reload()}
    />
  );
}
