import type { types as MediasoupTypes } from "mediasoup";
import { rtpPorts, type RtpPortPair } from "./config";

export function createSdp(
  audioConsumer: MediasoupTypes.Consumer,
  videoConsumer: MediasoupTypes.Consumer,
) {
  return [
    "v=0",
    "o=- 0 0 IN IP4 127.0.0.1",
    "s=-",
    "c=IN IP4 127.0.0.1",
    "t=0 0",
    mediaSdp("audio", rtpPorts.audio, audioConsumer.rtpParameters),
    mediaSdp("video", rtpPorts.video, videoConsumer.rtpParameters),
    "",
  ].join("\n");
}

function mediaSdp(
  kind: "audio" | "video",
  ports: RtpPortPair,
  rtpParameters: MediasoupTypes.RtpParameters,
) {
  const codec = rtpParameters.codecs[0]!;
  const codecName = codec.mimeType.split("/")[1]!;
  const channels = codec.channels && codec.channels > 1 ? `/${codec.channels}` : "";
  const fmtp = Object.entries(codec.parameters ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join(";");

  return [
    `m=${kind} ${ports.rtp} RTP/AVPF ${codec.payloadType}`,
    `a=rtcp:${ports.rtcp}`,
    `a=rtpmap:${codec.payloadType} ${codecName}/${codec.clockRate}${channels}`,
    kind === "video" ? `a=framesize:${codec.payloadType} 1280-720` : undefined,
    kind === "video" ? "a=framerate:30" : undefined,
    ssrcLine(rtpParameters),
    fmtp ? `a=fmtp:${codec.payloadType} ${fmtp}` : undefined,
    "a=recvonly",
  ]
    .filter(Boolean)
    .join("\n");
}

function ssrcLine(rtpParameters: MediasoupTypes.RtpParameters) {
  const ssrc = rtpParameters.encodings?.[0]?.ssrc;
  if (!ssrc) return undefined;
  const cname = rtpParameters.rtcp?.cname;
  return cname ? `a=ssrc:${ssrc} cname:${cname}` : `a=ssrc:${ssrc}`;
}
