import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { types as MediasoupTypes } from "mediasoup";

export type HlsSession = {
  started: boolean;
  ffmpeg?: ChildProcessWithoutNullStreams;
  transports: MediasoupTypes.PlainTransport[];
  consumers: MediasoupTypes.Consumer[];
};
