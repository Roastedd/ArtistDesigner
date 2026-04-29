import { createPersona } from "../actions";

export default function NewPersonaPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">New persona</h1>
      <form action={createPersona} className="space-y-4">
        <div>
          <div className="label mb-1">Name</div>
          <input name="name" required className="input" placeholder="e.g. NOVA-7" />
        </div>
        <div>
          <div className="label mb-1">Tagline</div>
          <input name="tagline" className="input" placeholder="A glitch-soul ghost from a dead radio station" />
        </div>
        <div>
          <div className="label mb-1">Bio</div>
          <textarea name="bio" className="input" rows={4} />
        </div>
        <div>
          <div className="label mb-1">Genres (comma-separated)</div>
          <input name="genres" className="input" placeholder="alt-r&b, glitch-pop, trip-hop" />
        </div>
        <div>
          <div className="label mb-1">Vocal style</div>
          <input name="vocalStyle" className="input" placeholder="breathy alto, autotuned ad-libs" />
        </div>
        <button type="submit" className="btn">Create persona</button>
      </form>
    </div>
  );
}
