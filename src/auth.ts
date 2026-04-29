import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";

const hasSmtp = !!(process.env.EMAIL_SERVER && process.env.EMAIL_FROM);
const hasResend = !!process.env.RESEND_API_KEY;
const hasGitHub = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

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

const isRealEmail = hasSmtp || hasResend;

const providers = [];

if (hasGitHub) {
  providers.push(GitHub);
}

providers.push(
  Nodemailer({
    server: resolveSmtpServer(),
    from: resolveFrom(),
    sendVerificationRequest: isRealEmail
      ? undefined
      : async ({ identifier, url }) => {
          // Dev mode: print the magic link to the server console.
          console.log("\n\u001b[35m[auth] magic link for\u001b[0m", identifier);
          console.log("\u001b[36m" + url + "\u001b[0m\n");
        },
  }),
);

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

export { isRealEmail };
