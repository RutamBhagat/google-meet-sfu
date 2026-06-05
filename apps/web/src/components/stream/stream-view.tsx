import { useEffect, useState, type ReactNode } from "react";

import { Badge } from "@google-meet-sfu/ui/components/badge";
import { Button } from "@google-meet-sfu/ui/components/button";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

import { VideoCard } from "./video-card";

export function StreamView({
  status,
  error,
  localStream,
  remoteStream,
}: {
  status: string;
  error?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  onRejoin: () => void;
}) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
  }, [localStream, micEnabled]);

  useEffect(() => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled;
    });
  }, [localStream, cameraEnabled]);

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-[oklch(0.105_0.01_260)] text-[oklch(0.96_0.006_250)]">
      <div className="flex h-16 shrink-0 items-center justify-between px-7">
        <span className="text-sm font-medium">
          {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}
        </span>
        <Badge variant={error ? "destructive" : "secondary"}>{status}</Badge>
      </div>

      {error ? (
        <div className="mx-4 mb-3 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid flex-1 gap-3 px-4 pb-3 md:grid-cols-2">
        <VideoCard stream={localStream} muted />
        <VideoCard stream={remoteStream} />
      </div>

      <div className="relative flex h-20 shrink-0 items-center justify-center px-7">
        <div className="flex items-center gap-2">
          <ControlIcon
            icon={micEnabled ? <Mic /> : <MicOff />}
            active={micEnabled}
            onClick={() => setMicEnabled((enabled) => !enabled)}
          />
          <ControlIcon
            icon={cameraEnabled ? <Video /> : <VideoOff />}
            active={cameraEnabled}
            onClick={() => setCameraEnabled((enabled) => !enabled)}
          />
        </div>
      </div>
    </main>
  );
}

function ControlIcon({
  icon,
  active,
  onClick,
}: {
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={onClick}
      className={
        active
          ? "size-12 rounded-full bg-[oklch(0.24_0.01_260)] text-[oklch(0.9_0.006_250)] hover:bg-[oklch(0.29_0.01_260)] [&_svg]:size-5"
          : "size-12 rounded-full bg-[oklch(0.92_0.01_250)] text-[oklch(0.14_0.01_260)] hover:bg-[oklch(0.86_0.01_250)] [&_svg]:size-5"
      }
    >
      {icon}
    </Button>
  );
}
