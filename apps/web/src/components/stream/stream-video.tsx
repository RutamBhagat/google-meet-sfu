import { useEffect, useRef } from "react";

export function StreamVideo({ stream, muted }: { stream?: MediaStream; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream ?? null;
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className="aspect-video w-full bg-muted object-cover"
    />
  );
}
