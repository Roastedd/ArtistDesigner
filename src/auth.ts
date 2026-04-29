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
const hasGitHub = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

const providers = [];

if (hasGitHub) {
  providers.push(GitHub);
}

providers.push(
  Nodemailer({
    // dummy server when SMTP isn't configured; sendVerificationRequest is overridden so it never connects
    server: hasSmtp ? process.env.EMAIL_SERVER! : "smtp://user:pass@localhost:25",
    from: process.env.EMAIL_FROM ?? "dev@artistdesigner.local",
    sendVerificationRequest: hasSmtp
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
