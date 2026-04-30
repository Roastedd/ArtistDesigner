import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { verifyPassword } from "@/lib/password";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";

const hasSmtp = !!(process.env.EMAIL_SERVER && process.env.EMAIL_FROM);
const hasResend = !!process.env.RESEND_API_KEY;
const hasGitHub = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const hasMagicLink = hasSmtp || hasResend;

// Build SMTP server string: explicit EMAIL_SERVER > Resend SMTP > dev fallback
function resolveSmtpServer() {
  if (hasSmtp) return process.env.EMAIL_SERVER!;
  if (hasResend) return `smtps://resend:${process.env.RESEND_API_KEY}@smtp.resend.com:465`;
  return "smtp://user:pass@localhost:25";
}

function resolveFrom() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (hasResend) return "ArtistDesigner <onboarding@resend.dev>";
  return "dev@artistdesigner.local";
}

const providers = [];

if (hasGitHub) {
  providers.push(GitHub);
}

providers.push(
  Credentials({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user?.passwordHash) return null;
      if (!verifyPassword(password, user.passwordHash)) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
);

if (hasMagicLink) {
  providers.push(
    Nodemailer({
      server: resolveSmtpServer(),
      from: resolveFrom(),
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  providers,
  pages: {
    signIn: "/sign-in",
  },
});

export { hasMagicLink };
