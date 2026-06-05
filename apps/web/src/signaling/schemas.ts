import type { Device, types as MediasoupTypes } from "mediasoup-client";
import { z } from "zod";

export const appDataSchema = z.looseObject({
  peerId: z.string().optional(),
  program: z.boolean().optional(),
});

export const producerInfoSchema = z.object({
  id: z.string(),
  kind: z.enum(["audio", "video"]),
  appData: appDataSchema.optional(),
});

export const newProducerSchema = producerInfoSchema.extend({
  action: z.literal("newProducer"),
  producerId: z.string(),
});

export const wsResponseSchema = z.discriminatedUnion("ok", [
  z.object({ id: z.string(), ok: z.literal(true), data: z.unknown() }),
  z.object({ id: z.string(), ok: z.literal(false), error: z.string() }),
]);

export type TransportOptions = Parameters<Device["createSendTransport"]>[0];
export type ProducerInfo = z.infer<typeof producerInfoSchema>;

export const transportOptionsSchema = z.custom<TransportOptions>();
export const rtpCapabilitiesSchema = z.custom<MediasoupTypes.RtpCapabilities>();
export const rtpParametersSchema = z.custom<MediasoupTypes.RtpParameters>();

export const consumeResponseSchema = z.object({
  id: z.string(),
  producerId: z.string(),
  kind: z.enum(["audio", "video"]),
  rtpParameters: rtpParametersSchema,
});

export const produceResponseSchema = z.object({ id: z.string() });
export const nullResponseSchema = z.null();
export const producerListSchema = z.array(producerInfoSchema);
