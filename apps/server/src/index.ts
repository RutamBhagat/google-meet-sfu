import { cors } from "@elysiajs/cors";
import { node } from "@elysiajs/node";
import { openapi } from "@elysiajs/openapi";
import { env } from "@google-meet-sfu/env/server";
import { Elysia } from "elysia";
import { hlsResponse } from "./hls";
import { createRoom } from "./mediasoup/room";
import { createSignalingPlugin } from "./signaling";

const room = await createRoom();
const adapter = node();

new Elysia({ adapter })
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
    }),
  )
  .use(
    openapi({
      provider: "scalar",
      documentation: {
        info: {
          title: "Google Meet SFU API",
          version: "1.0.0",
        },
      },
    }),
  )
  .get("/", () => `OK worker:${room.worker.pid} router:${room.router.id}`)
  .get("/hls/:file", ({ params }) => hlsResponse(params.file))
  .use(createSignalingPlugin(room, adapter))
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
