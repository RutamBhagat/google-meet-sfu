import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { hlsDir } from "./config";

export async function resetHlsDir() {
  await rm(hlsDir, { recursive: true, force: true });
  await mkdir(hlsDir, { recursive: true });
}

export async function hlsResponse(file: string): Promise<Response> {
  const body = await readFile(path.join(hlsDir, path.basename(file)));
  const contentType = file.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : file.endsWith(".ts")
      ? "video/mp2t"
      : "application/octet-stream";
  return new Response(body, { headers: { "content-type": contentType } });
}
