import { cors } from "@elysiajs/cors";
import { node } from "@elysiajs/node";
import { env } from "@google-meet-sfu/env/server";
import { Elysia } from "elysia";

new Elysia({ adapter: node() })
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
    }),
  )
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
