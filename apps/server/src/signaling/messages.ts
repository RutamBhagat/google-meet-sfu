import { z } from "zod";
import type { types as MediasoupTypes } from "mediasoup";

const dtlsParametersSchema = z.custom<MediasoupTypes.DtlsParameters>();
const rtpParametersSchema = z.custom<MediasoupTypes.RtpParameters>();
const rtpCapabilitiesSchema = z.custom<MediasoupTypes.RtpCapabilities>();

export const signalingMessageSchema = z.discriminatedUnion("action", [
  z.object({ id: z.string(), action: z.literal("getRouterRtpCapabilities") }),
  z.object({
    id: z.string(),
    action: z.literal("createWebRtcTransport"),
    direction: z.enum(["send", "recv"]),
  }),
  z.object({
    id: z.string(),
    action: z.literal("connectTransport"),
    transportId: z.string(),
    dtlsParameters: dtlsParametersSchema,
  }),
  z.object({
    id: z.string(),
    action: z.literal("produce"),
    transportId: z.string(),
    kind: z.enum(["audio", "video"]),
    rtpParameters: rtpParametersSchema,
    appData: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    id: z.string(),
    action: z.literal("consume"),
    transportId: z.string(),
    producerId: z.string(),
    rtpCapabilities: rtpCapabilitiesSchema,
  }),
  z.object({
    id: z.string(),
    action: z.literal("resumeConsumer"),
    consumerId: z.string(),
  }),
  z.object({ id: z.string(), action: z.literal("listProducers") }),
]);

export type SignalingMessage = z.infer<typeof signalingMessageSchema>;

export type SignalingSocket = {
  raw: { data: { id?: string } };
  send: (message: string) => unknown;
};
