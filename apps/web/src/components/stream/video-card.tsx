import { Card, CardContent } from "@google-meet-sfu/ui/components/card";
import { cn } from "@google-meet-sfu/ui/lib/utils";

import { StreamVideo } from "./stream-video";

export function VideoCard({
  stream,
  muted,
  active,
}: {
  stream?: MediaStream;
  muted?: boolean;
  active?: boolean;
}) {
  const hasVideo = stream?.getVideoTracks().length;

  return (
    <Card
      className={cn(
        "relative h-full min-h-64 gap-0 overflow-hidden rounded-3xl bg-[oklch(0.19_0.055_264)] py-0",
        active ? "ring-3 ring-[oklch(0.75_0.12_252)]" : "ring-1 ring-white/5",
      )}
    >
      <CardContent className="absolute inset-0 px-0">
        {hasVideo ? (
          <StreamVideo stream={stream} muted={muted} />
        ) : (
          <div className="h-full bg-[radial-gradient(circle_at_50%_58%,oklch(0.25_0.07_265),oklch(0.17_0.055_264)_62%,oklch(0.14_0.05_264))]" />
        )}
      </CardContent>
    </Card>
  );
}
