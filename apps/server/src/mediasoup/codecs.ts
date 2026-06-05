import type { types as MediasoupTypes } from "mediasoup";

export const mediaCodecs: MediasoupTypes.RouterRtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48_000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90_000,
    rtcpFeedback: [
      { type: "nack" },
      { type: "nack", parameter: "pli" },
      { type: "ccm", parameter: "fir" },
      { type: "goog-remb" },
      { type: "transport-cc" },
    ],
  },
];
