import path from "node:path";

export const hlsDir = path.resolve(process.cwd(), ".temp/hls");
export const sdpPath = path.join(hlsDir, "input.sdp");
export const playlistPath = path.join(hlsDir, "live.m3u8");
export const segmentPath = path.join(hlsDir, "segment_%03d.ts");

export const rtpPorts = {
  audio: { rtp: 5004, rtcp: 5005 },
  video: { rtp: 5006, rtcp: 5007 },
} as const;

export type RtpPortPair = (typeof rtpPorts)[keyof typeof rtpPorts];
