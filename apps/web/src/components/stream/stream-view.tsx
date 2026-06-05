import { Badge } from "@google-meet-sfu/ui/components/badge";
import { Button } from "@google-meet-sfu/ui/components/button";

import { VideoCard } from "./video-card";

export function StreamView({
  status,
  error,
  localStream,
  remoteStream,
  onRejoin,
}: {
  status: string;
  error?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  onRejoin: () => void;
}) {
  return (
    <main className="container mx-auto grid max-w-5xl gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Stream</h1>
          <p className="text-sm text-muted-foreground">Happy-path two-person SFU room.</p>
        </div>
        <Badge variant={error ? "destructive" : "secondary"}>{status}</Badge>
      </div>

      {error ? (
        <p className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <VideoCard title="You" description="Local camera + microphone" stream={localStream} muted />
        <VideoCard title="Remote" description="Other /stream tab" stream={remoteStream} />
      </div>

      <Button variant="outline" onClick={onRejoin} className="w-fit">
        Rejoin
      </Button>
    </main>
  );
}
