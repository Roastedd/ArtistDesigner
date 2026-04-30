import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { MessageSquare } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { feedback, users } from "@/db/schema";

export const dynamic = "force-dynamic";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export default async function AdminFeedbackPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/sign-in");

  const allowed = adminEmails();
  // If no ADMIN_EMAILS configured, fall back to letting any signed-in user view
  // their own feedback only — but in practice you should set ADMIN_EMAILS.
  const isAdmin = allowed.length === 0 ? false : allowed.includes(email);
  if (!isAdmin) {
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Admin-only. Set the <code>ADMIN_EMAILS</code> env var (comma-separated)
          to grant access. Your account: <code>{email}</code>
        </p>
      </div>
    );
  }

  const rows = await db
    .select({
      id: feedback.id,
      emoji: feedback.emoji,
      message: feedback.message,
      createdAt: feedback.createdAt,
      userEmail: users.email,
      userName: users.name,
    })
    .from(feedback)
    .leftJoin(users, eq(users.id, feedback.userId))
    .orderBy(desc(feedback.createdAt))
    .limit(200);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-[color:var(--color-accent)]" />
          Feedback
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1 text-sm">
          {rows.length} most recent {rows.length === 1 ? "entry" : "entries"}.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card text-sm text-[color:var(--color-muted)]">
          No feedback yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card">
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{r.emoji ?? "💬"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {r.message || (
                      <span className="text-[color:var(--color-muted)] italic">
                        (no message)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[color:var(--color-muted)] mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{r.userEmail ?? r.userName ?? "anonymous"}</span>
                    <span>·</span>
                    <span>
                      {new Date(r.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
