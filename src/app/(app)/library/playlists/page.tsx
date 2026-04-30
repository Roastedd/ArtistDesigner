import { ListMusic } from "lucide-react";

export default function PlaylistsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Playlists</h1>
        <p className="text-[color:var(--color-muted)] mt-1 text-sm">
          Curate setlists and seasonal drops.
        </p>
      </div>
      <div className="card text-center py-16">
        <ListMusic className="h-10 w-10 mx-auto mb-3 text-[color:var(--color-muted)]" />
        <h2 className="font-semibold">Playlists are coming soon</h2>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          You&apos;ll be able to group tracks across artists into shareable lists.
        </p>
      </div>
    </div>
  );
}
