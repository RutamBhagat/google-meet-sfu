import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@google-meet-sfu/ui/components/card";

import { StreamVideo } from "./stream-video";

export function VideoCard({
  title,
  description,
  stream,
  muted,
}: {
  title: string;
  description: string;
  stream?: MediaStream;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <StreamVideo stream={stream} muted={muted} />
      </CardContent>
    </Card>
  );
}
