import { cors } from "@elysiajs/cors";
import { node } from "@elysiajs/node";
import { openapi } from "@elysiajs/openapi";
import { env } from "@google-meet-sfu/env/server";
import { Elysia } from "elysia";
import { createRoom } from "./mediasoup/room";
import { createSignalingPlugin } from "./signaling";

const room = await createRoom();

new Elysia({ adapter: node() })
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
  .use(createSignalingPlugin(room))
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
