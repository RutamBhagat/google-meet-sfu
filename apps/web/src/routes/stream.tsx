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

async function getMissingMediaDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return ["camera", "microphone"];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return [
    devices.some((device) => device.kind === "videoinput") ? undefined : "camera",
    devices.some((device) => device.kind === "audioinput") ? undefined : "microphone",
  ].filter((device) => device !== undefined);
}

async function assertRequiredMediaDevices() {
  const missing = await getMissingMediaDevices();
  if (missing.length) {
    throw new Error(
      `No ${missing.join(" or ")} found. Connect the missing device, then rejoin.`,
    );
  }
}

function drawVideoCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return;

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const cropX = (sourceWidth - cropWidth) / 2;
  const cropY = (sourceHeight - cropHeight) / 2;

  context.drawImage(
    video,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    x,
    y,
    width,
    height,
  );
}

async function describeGetUserMediaFailure(reason: unknown) {
  if (!(reason instanceof DOMException)) {
    return reason instanceof Error ? reason.message : String(reason);
  }

  if (reason.name === "NotFoundError") {
    const missing = await getMissingMediaDevices();
    return missing.length
      ? `No ${missing.join(" or ")} found. Connect the missing device, then rejoin. (${reason.name})`
      : `No camera or microphone matched the requested constraints. (${reason.name})`;
  }

  if (reason.name === "NotAllowedError") {
    return `Camera or microphone permission was denied. Allow access in your browser/site settings, then rejoin. (${reason.name})`;
  }

  if (reason.name === "NotReadableError") {
    return `Camera or microphone exists, but the browser could not open it. Close other apps using it, then rejoin. (${reason.name})`;
  }

  return `${reason.name}: ${reason.message}`;
}

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
    let isProgramPeer = false;
    let programStarted = false;
    let programFrame = 0;
    let programAudio: AudioContext | undefined;
    let programStream: MediaStream | undefined;
    const programProducers: MediasoupTypes.Producer[] = [];

    async function startProgramFeed(remote: MediaStream) {
      if (!isProgramPeer || programStarted || !local || !sendTransport) return;
      if (!local.getVideoTracks()[0] || !remote.getVideoTracks()[0]) return;
      programStarted = true;

      const localVideo = document.createElement("video");
      localVideo.srcObject = local;
      localVideo.muted = true;
      localVideo.playsInline = true;
      await localVideo.play();

      const remoteVideo = document.createElement("video");
      remoteVideo.srcObject = remote;
      remoteVideo.muted = true;
      remoteVideo.playsInline = true;
      await remoteVideo.play();

      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas unavailable");

      const draw = () => {
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas.width, canvas.height);
        drawVideoCover(context, localVideo, 0, 0, 640, 720);
        drawVideoCover(context, remoteVideo, 640, 0, 640, 720);
        programFrame = requestAnimationFrame(draw);
      };
      draw();

      programAudio = new AudioContext();
      const destination = programAudio.createMediaStreamDestination();
      for (const track of [
        ...local.getAudioTracks(),
        ...remote.getAudioTracks(),
      ]) {
        const source = programAudio.createMediaStreamSource(
          new MediaStream([track]),
        );
        source.connect(destination);
      }

      programStream = new MediaStream([
        canvas.captureStream(30).getVideoTracks()[0],
        destination.stream.getAudioTracks()[0],
      ]);

      for (const track of programStream.getTracks()) {
        const producer = await sendTransport.produce({
          track,
          appData: { program: true, source: `program-${track.kind}` },
          encodings: track.kind === "video" ? [{ maxBitrate: 2_500_000 }] : undefined,
          codecOptions: track.kind === "video" ? { videoGoogleStartBitrate: 2500 } : undefined,
        });
        programProducers.push(producer);
      }
    }

    async function run() {
      await assertRequiredMediaDevices();
      if (closed) return;

      await signaling.ready();
      if (closed) return;

      const device = new Device();
      const routerRtpCapabilities = await signaling.request(
        { action: "getRouterRtpCapabilities" },
        rtpCapabilitiesSchema,
      );
      await device.load({ routerRtpCapabilities });
      const initialProducers = await signaling.request(
        { action: "listProducers" },
        producerListSchema,
      );
      isProgramPeer = initialProducers.length === 0;

      try {
        local = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
          audio: true,
        });
      } catch (reason) {
        throw new Error(await describeGetUserMediaFailure(reason));
      }
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
        let remote: MediaStream | undefined;
        setRemoteStreams((current) => {
          const next = new Map(current);
          remote = next.get(peerId) ?? new MediaStream();
          remote.addTrack(consumer.track);
          next.set(peerId, remote);
          return next;
        });
        await signaling.request(
          { action: "resumeConsumer", consumerId: consumer.id },
          nullResponseSchema,
        );
        await startProgramFeed(remote!);
      }

      signaling.onProducer = consume;
      await Promise.all(initialProducers.map(consume));
      setStatus("connected");
    }

    run().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason));
      setStatus("failed");
    });

    return () => {
      closed = true;
      if (programFrame) cancelAnimationFrame(programFrame);
      void programAudio?.close();
      programStream?.getTracks().forEach((track) => track.stop());
      programProducers.forEach((producer) => producer.close());
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
