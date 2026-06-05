import { writeFile } from "node:fs/promises";
import type { types as MediasoupTypes } from "mediasoup";
import { playlistPath, rtpPorts, sdpPath } from "./config";
import { resetHlsDir } from "./files";
import { spawnHlsFfmpeg } from "./ffmpeg";
import { createPlainConsumer } from "./plain-consumer";
import { createSdp } from "./sdp";
import type { HlsSession } from "./types";
import type { Room } from "../mediasoup/room";

export type { HlsSession } from "./types";
export { hlsResponse } from "./files";

export async function startHlsIfReady(room: Room) {
  if (room.hls.started) return;

  const { audioProducer, videoProducer } = findProgramProducers(room);
  if (!audioProducer || !videoProducer) return;

  room.hls.started = true;
  await resetHlsDir();

  const audio = await createPlainConsumer(room, audioProducer, rtpPorts.audio);
  const video = await createPlainConsumer(room, videoProducer, rtpPorts.video);
  await writeFile(sdpPath, createSdp(audio.consumer, video.consumer));

  const ffmpeg = spawnHlsFfmpeg();
  room.hls.ffmpeg = ffmpeg;

  ffmpeg.stderr.on("data", (chunk) => console.log(`[ffmpeg] ${chunk}`.trim()));
  ffmpeg.on("exit", (code, signal) => {
    console.log(`[ffmpeg] exited code=${code} signal=${signal}`);
    void resetSession(room.hls);
  });
  audioProducer.observer.once("close", () => stopHls(room.hls));
  videoProducer.observer.once("close", () => stopHls(room.hls));

  await delay(1000);
  await audio.consumer.resume();
  await video.consumer.resume();
  await video.consumer.requestKeyFrame();
  for (const ms of [1000, 2000, 3000]) {
    setTimeout(() => void video.consumer.requestKeyFrame(), ms);
  }
  console.log(`HLS started at ${playlistPath}`);
}

function findProgramProducers(room: Room) {
  const programProducers = [...room.producers.values()].filter(
    (producer) => producer.appData.program === true,
  );

  return {
    audioProducer: programProducers.find((producer) => producer.kind === "audio"),
    videoProducer: programProducers.find((producer) => producer.kind === "video"),
  } satisfies {
    audioProducer?: MediasoupTypes.Producer;
    videoProducer?: MediasoupTypes.Producer;
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopHls(session: HlsSession) {
  session.ffmpeg?.kill("SIGTERM");
}

async function resetSession(session: HlsSession) {
  session.started = false;
  session.ffmpeg = undefined;
  for (const consumer of session.consumers) consumer.close();
  for (const transport of session.transports) transport.close();
  session.consumers = [];
  session.transports = [];
  await resetHlsDir();
}
