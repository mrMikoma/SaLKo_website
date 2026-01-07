import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import * as bcrypt from "bcrypt";
import pool from "./utilities/db";
import { LoginFormSchema } from "./utilities/definitions";

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
      authorize: async (credentials) => {
        // Validate input
        const parsed = LoginFormSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        try {
          // Query user
          const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 AND auth_provider = 'credentials'",
            [email]
          );

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          // Verify password with bcrypt
          if (!user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return null;
          }

          // Update last login
          await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
            user.id,
          ]);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
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
            "SELECT * FROM users WHERE email = $1",
            [email]
          );

          if (result.rows.length === 0) {
            // Auto-create user on first Google login
            await pool.query(
              `INSERT INTO users (email, name, full_name, role, auth_provider, google_id, email_verified, avatar_url, phone, address, city, postal_code)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '', '', '', '')`,
              [
                email,
                profile?.name || email.split("@")[0],
                profile?.name || email.split("@")[0],
                "user", // Default role
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
               WHERE email = $4`,
              [profile?.sub, profile?.picture, true, email]
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

        console.log("[JWT] Google OAuth - Fetching user data for email:", user.email);
        try {
          const result = await pool.query(
            "SELECT id, role, full_name FROM users WHERE email = $1",
            [user.email]
          );
          if (result.rows.length > 0) {
            token.id = result.rows[0].id;
            token.role = result.rows[0].role;
            token.fullName = result.rows[0].full_name;
            console.log("[JWT] Google OAuth - User found, ID:", token.id);
          } else {
            console.error("[JWT] Google OAuth - No user found in database for email:", user.email);
          }
        } catch (error) {
          console.error("[JWT] Error fetching user data for Google OAuth:", error);
        }
      }
      // For credentials provider, user object contains our database fields
      else if (user && account?.provider === "credentials") {
        token.id = user.id;
        token.role = (user as any).role;
        token.fullName = (user as any).fullName;
      }

      console.log("[JWT] Final token - ID:", token.id, "Email:", token.email);
      return token;
    },

    async session({ session, token }) {
      console.log("[SESSION] Token ID:", token.id, "Token email:", token.email);

      try {
        if (token.id) {
          // Fetch fresh user data from database to ensure we have latest role/info
          const result = await pool.query(
            "SELECT id, email, name, full_name, role, avatar_url FROM users WHERE id = $1",
            [token.id]
          );

          if (result.rows.length > 0) {
            const user = result.rows[0];
            session.user.id = user.id;
            session.user.role = user.role;
            session.user.name = user.name;
            session.user.fullName = user.full_name;
            session.user.email = user.email;
            session.user.image = user.avatar_url;
            console.log("[SESSION] User found by ID:", user.id);
          } else {
            // User not found - this can happen during logout or if user was deleted
            // Return null to invalidate the session
            console.log("[SESSION] No user found for ID:", token.id, "- session will be invalidated");
            return null as any;
          }
        } else {
          // No token ID - session is invalid
          console.log("[SESSION] Token missing user ID - session will be invalidated");
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
