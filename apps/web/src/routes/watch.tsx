import { Badge } from "@google-meet-sfu/ui/components/badge";
import { Card, CardContent } from "@google-meet-sfu/ui/components/card";
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
      const hls = new Hls({
        liveSyncDuration: 10,
        liveMaxLatencyDuration: 30,
      });
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(HLS_URL));
      hls.on(Hls.Events.MANIFEST_PARSED, () => setStatus("playing with hls.js"));
      hls.on(Hls.Events.ERROR, (_, data) => {
        setStatus(data.fatal ? "waiting for stream" : data.details);
        if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        if (data.fatal && data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      });
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
    <main className="flex h-svh flex-col overflow-hidden bg-[oklch(0.105_0.01_260)] text-[oklch(0.96_0.006_250)]">
      <div className="flex h-16 shrink-0 items-center justify-between px-7">
        <span className="text-sm font-medium">
          {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}
        </span>
        <Badge variant="secondary">{status}</Badge>
      </div>

      <Card className="relative mx-4 mb-4 flex-1 gap-0 overflow-hidden rounded-3xl bg-[oklch(0.19_0.055_264)] py-0 ring-1 ring-white/5">
        <CardContent className="absolute inset-0 px-0">
          <video
            ref={videoRef}
            controls
            autoPlay
            muted
            playsInline
            className="h-full w-full bg-muted object-cover"
          />
        </CardContent>
      </Card>
    </main>
  );
}
