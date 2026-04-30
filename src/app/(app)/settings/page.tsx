import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { updatePreferences } from "./actions";

const SWATCHES = ["#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#f87171"];

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [u] = await db.select().from(users).where(eq(users.id, userId));

  return (
    <div className="max-w-2xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <form action={updatePreferences} className="card space-y-5">
        <div>
          <div className="label mb-2">Theme</div>
          <div className="flex gap-3">
            {["dark", "light"].map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  defaultChecked={(u?.theme ?? "dark") === t}
                />
                <span className="capitalize text-sm">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="label mb-2">Accent color</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {}}
                className="w-8 h-8 rounded-full border-2 border-[color:var(--color-border)]"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <input
            name="accentColor"
            type="text"
            pattern="^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"
            defaultValue={u?.accentColor ?? ""}
            placeholder="#a78bfa"
            className="input font-mono text-sm"
          />
          <div className="text-xs text-[color:var(--color-muted)] mt-1">
            Hex value. Leave blank for the default purple.
          </div>
        </div>

        <button className="btn">Save preferences</button>
      </form>
    </div>
  );
}
