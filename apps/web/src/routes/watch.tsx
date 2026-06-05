import { Badge } from "@google-meet-sfu/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@google-meet-sfu/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

const HLS_URL = "http://localhost:3000/hls/live.m3u8";

export const Route = createFileRoute("/watch")({
  component: WatchRoute,
});

function WatchRoute() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("loading HLS");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(HLS_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setStatus("playing with hls.js"));
      hls.on(Hls.Events.ERROR, () => setStatus("waiting for stream"));
      return () => hls.destroy();
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_URL;
      video.addEventListener("loadedmetadata", () => setStatus("playing native HLS"), { once: true });
      return;
    }

    setStatus("HLS unsupported");
  }, []);

  return (
    <main className="container mx-auto grid max-w-5xl gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Watch</h1>
          <p className="text-sm text-muted-foreground">HLS playback from the server program feed.</p>
        </div>
        <Badge variant="secondary">{status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live feed</CardTitle>
          <CardDescription>{HLS_URL}</CardDescription>
        </CardHeader>
        <CardContent>
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="aspect-video w-full bg-muted object-contain"
          />
        </CardContent>
      </Card>
    </main>
  );
}
