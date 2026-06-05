import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-4 font-medium">Choose a path</h2>
          <div className="flex gap-3">
            <Link className="rounded-md border px-4 py-2 hover:bg-muted" to="/stream">
              Stream
            </Link>
            <Link className="rounded-md border px-4 py-2 hover:bg-muted" to="/watch">
              Watch
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
