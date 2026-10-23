import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import pool from "./utilities/db";
import { LoginFormSchema } from "./utilities/definitions";
import { clientIp } from "./utilities/rateLimit";
import {
  emailKey,
  failedLoginsByEmail,
  failedLoginsByIp,
  loginBlockedFor,
  TooManyLoginAttempts,
} from "./utilities/loginLimits";

// Compared against when the email has no password account, so that a wrong
// email takes as long as a wrong password and the timing doesn't reveal who
// has an account. Same cost as the real hashes.
let dummyHash: Promise<string> | null = null;
async function comparePassword(password: string, hash: string | null): Promise<boolean> {
  if (hash) return bcrypt.compare(password, hash);
  dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), 10);
  await bcrypt.compare(password, await dummyHash);
  return false;
}

// Accounts whose emails differ only in case (allowed before emails were
// lowercased) are picked in a fixed order: the exact spelling first
const SAME_EMAIL_ORDER = "ORDER BY (email = $1) DESC, created_at, id";

const isGuestOnly = (roles: string[] | null) => !roles || (roles.length === 1 && roles[0] === "guest");

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Google Workspace OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: "savonlinnanlentokerho.fi", // Restrict to your workspace domain
          prompt: "select_account",
        },
      },
    }),

    // Traditional credentials
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        // Validate input
        const parsed = LoginFormSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const ip = clientIp(request.headers);
        // Too many failed logins for this email or from this address
        if (loginBlockedFor(email, ip) > 0) {
          throw new TooManyLoginAttempts();
        }
        const failed = () => {
          failedLoginsByEmail.hit(emailKey(email));
          failedLoginsByIp.hit(ip);
          return null;
        };

        try {
          // Emails compare in lower case; deactivated users can't log in
          const result = await pool.query(
            `SELECT * FROM users
             WHERE lower(email) = lower($1) AND auth_provider = 'credentials'
               AND deactivated_at IS NULL
             ${SAME_EMAIL_ORDER}`,
            [email]
          );

          // The first account whose password matches
          let user = null;
          for (const row of result.rows) {
            if (await comparePassword(password, row.password)) {
              user = row;
              break;
            }
          }
          if (result.rows.length === 0) {
            await comparePassword(password, null);
          }
          if (!user) {
            return failed();
          }

          // Block users who only have the "guest" role (data-only entries)
          if (isGuestOnly(user.roles)) {
            console.log("Login blocked for a guest-only user");
            return null;
          }

          failedLoginsByEmail.reset(emailKey(email));

          // Update last login
          await pool.query(
            "UPDATE users SET last_login = NOW() WHERE id = $1",
            [user.id]
          );

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles,
            fullName: user.full_name,
            image: user.avatar_url,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Verify domain for Google Workspace
        const email = user.email || profile?.email;
        if (!email?.endsWith("@savonlinnanlentokerho.fi")) {
          console.error("Rejected non-workspace email:", email);
          return false; // Reject non-workspace emails
        }

        try {
          // Check if user exists or create new one
          const result = await pool.query(
            `SELECT * FROM users WHERE lower(email) = lower($1) ${SAME_EMAIL_ORDER}`,
            [email]
          );

          if (result.rows.length > 0 && result.rows[0].deactivated_at) {
            console.log("Login blocked for deactivated user:", email);
            return false;
          }
          // As with passwords: guest-only entries are data, not accounts
          if (result.rows.length > 0 && isGuestOnly(result.rows[0].roles)) {
            console.log("Google login blocked for a guest-only user");
            return false;
          }

          if (result.rows.length === 0) {
            // Auto-create user on first Google login
            await pool.query(
              `INSERT INTO users (email, name, full_name, roles, auth_provider, google_id, email_verified, avatar_url, phone, address, city, postal_code, last_login)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '', '', '', '', NOW())`,
              [
                email.toLowerCase(),
                profile?.name || email.split("@")[0],
                profile?.name || email.split("@")[0],
                ["user"], // Default roles array
                "google",
                profile?.sub,
                true,
                profile?.picture,
              ]
            );
          } else {
            // Update existing user with Google info
            await pool.query(
              `UPDATE users SET google_id = $1, avatar_url = $2, email_verified = $3, last_login = NOW()
               WHERE id = $4`,
              [profile?.sub, profile?.picture, true, result.rows[0].id]
            );
          }
        } catch (error) {
          console.error("Google sign in error:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // For Google OAuth, always fetch user data from database
      // The user object from Google doesn't contain our database ID
      if (account?.provider === "google" && user?.email) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;

        console.log(
          "[JWT] Google OAuth - Fetching user data for email:",
          user.email
        );
        try {
          const result = await pool.query(
            `SELECT id, roles, full_name FROM users WHERE lower(email) = lower($1) ${SAME_EMAIL_ORDER}`,
            [user.email]
          );
          if (result.rows.length > 0) {
            token.id = result.rows[0].id;
            token.roles = result.rows[0].roles;
            token.fullName = result.rows[0].full_name;
            console.log("[JWT] Google OAuth - User found, ID:", token.id);
          } else {
            console.error(
              "[JWT] Google OAuth - No user found in database for email:",
              user.email
            );
          }
        } catch (error) {
          console.error(
            "[JWT] Error fetching user data for Google OAuth:",
            error
          );
        }
      }
      // For credentials provider, user object contains our database fields
      else if (user && account?.provider === "credentials") {
        token.id = user.id;
        token.roles = (user as any).roles;
        token.fullName = (user as any).fullName;
      }

      // When this session logged in: sessions_revoked_at after it ends the session
      if (user) {
        token.authAt = Math.floor(Date.now() / 1000);
      }

      console.log("[JWT] Final token - ID:", token.id, "Email:", token.email);
      return token;
    },

    async session({ session, token }) {
      console.log("[SESSION] Token ID:", token.id, "Token email:", token.email);

      try {
        if (token.id) {
          // Fetch fresh user data from database to ensure we have latest roles/info.
          // A deactivated user's session ends on the next request.
          const result = await pool.query(
            `SELECT id, email, name, full_name, roles, avatar_url, sessions_revoked_at FROM users
             WHERE id = $1 AND deactivated_at IS NULL`,
            [token.id]
          );
          const row = result.rows[0];
          // Sessions from before the latest password change or lock end, e.g.
          // after a reset because the account was compromised; and guest-only
          // entries can't hold a session (old tokens from before that rule)
          const revokedAt = row?.sessions_revoked_at
            ? Math.floor(new Date(row.sessions_revoked_at).getTime() / 1000)
            : 0;
          const authAt = typeof token.authAt === "number" ? token.authAt : 0;
          if (row && (revokedAt > authAt || isGuestOnly(row.roles))) {
            console.log("[SESSION] Session ended: revoked or guest-only, user", row.id);
            return null as any;
          }

          if (row) {
            const user = row;
            session.user.id = user.id;
            session.user.roles = user.roles;
            session.user.name = user.name;
            session.user.fullName = user.full_name;
            session.user.email = user.email;
            session.user.image = user.avatar_url;
            console.log("[SESSION] User found by ID:", user.id);
          } else {
            // User not found or deactivated - this can happen during logout or if user was deleted
            // Return null to invalidate the session
            console.log(
              "[SESSION] No user found for ID:",
              token.id,
              "- session will be invalidated"
            );
            return null as any;
          }
        } else {
          // No token ID - session is invalid
          console.log(
            "[SESSION] Token missing user ID - session will be invalidated"
          );
          return null as any;
        }
      } catch (error) {
        console.error("[SESSION] Error in session callback:", error);
        // On database error, invalidate the session
        return null as any;
      }

      console.log("[SESSION] Final session.user.id:", session.user?.id);
      return session;
    },
  },

  pages: {
    signIn: "/auth/login", // Custom login page
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  trustHost: true, // Required when behind Traefik reverse proxy
});
