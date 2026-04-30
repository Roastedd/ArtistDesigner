import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PreferencesForm } from "./preferences-form";

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

      <PreferencesForm
        initialTheme={u?.theme ?? "dark"}
        initialAccent={u?.accentColor ?? null}
      />
    </div>
  );
}
