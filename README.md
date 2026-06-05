# Google Meet SFU

A local WebRTC video-room prototype using mediasoup as an SFU, with a React web app for joining a call and an HLS watcher page for viewing a composed program feed.

https://github.com/user-attachments/assets/f06be2f9-2c85-4ac0-bcda-ec909afe8b83

## What This Does

This repo experiments with a small Google Meet-style media pipeline:

- `/stream` joins a WebRTC room, publishes local camera/microphone, and consumes another peer.
- The first peer creates a side-by-side "program" feed from its local stream plus the first remote stream.
- The server receives that program feed through mediasoup and uses FFmpeg to write HLS segments.
- `/watch` plays the generated HLS playlist with `hls.js`.

## Tech Stack

- **Runtime/package manager**: Bun workspace monorepo
- **Build orchestration**: Turborepo
- **Web app**: Vite, React, TanStack Router, Tailwind CSS
- **Media**: mediasoup, mediasoup-client, WebRTC, HLS, FFmpeg
- **Server**: Elysia with WebSocket signaling and CORS
- **Shared packages**: local UI components, env validation, shared TypeScript config

## Project Structure

```text
apps/
  server/   Elysia API, WebSocket signaling, mediasoup room, HLS output
  web/      React routes for streaming and watching
packages/
  config/   shared TypeScript config
  env/      typed server/web environment variables
  ui/       shared UI components and styles
```

## Prerequisites

- Bun `1.3.4` or newer
- FFmpeg available on your `PATH`
- A browser with camera/microphone access

## Environment

Create a root `.env` file:

```env
CORS_ORIGIN=http://localhost:3001
VITE_SERVER_URL=http://localhost:3000
```

> Note: the current signaling and HLS URLs in the web app target `localhost:3000`, and the mediasoup transport announced address is also local. This setup is intended for local development.

## Getting Started

Install dependencies:

```bash
bun install
```

Run the server and web app:

```bash
bun run dev
```

Or run them separately:

```bash
bun run dev:server
bun run dev:web
```

Then open:

- Web app: <http://localhost:3001>
- Stream page: <http://localhost:3001/stream>
- HLS watch page: <http://localhost:3001/watch>
- Server health check: <http://localhost:3000>

## How to Try the Demo

1. Start the server and web app.
2. Open `/stream` in one browser tab/window and allow camera/microphone access.
3. Open `/stream` in a second browser tab/window and allow camera/microphone access.
4. Open `/watch` to view the generated HLS program feed.

The HLS playlist and segments are written under `.temp/hls` while the stream is active.

## Useful Scripts

```bash
bun run dev          # run all dev tasks through Turbo
bun run build        # build all workspaces
bun run check-types  # type-check/build validation
bun run dev:web      # run only the Vite app
bun run dev:server   # run only the Elysia server
```

## How It Works

1. The web client connects to `ws://localhost:3000/ws`.
2. The server creates mediasoup WebRTC transports for sending and receiving media.
3. Clients produce camera/microphone tracks and consume other peers' producers.
4. The first peer builds a composed canvas/audio program feed and produces it back into the SFU.
5. The server detects the program audio/video producers, creates plain RTP consumers, writes an SDP file, and starts FFmpeg.
6. FFmpeg converts the RTP input into an HLS playlist served from `/hls/live.m3u8`.

## Current Limitations

- Localhost-oriented network configuration.
- Single in-memory mediasoup room.
- No auth, room IDs, persistence, or production deployment setup.
- HLS starts only after the program audio and video producers exist.

## Validation

The current repo passes:

```bash
bun run check-types
```
