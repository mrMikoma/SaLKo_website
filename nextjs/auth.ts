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
      // Add custom fields to token on initial sign in
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.fullName = (user as any).fullName;
      }

      // Add Google tokens if available
      if (account?.provider === "google") {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;

        // For Google OAuth, we need to fetch the user ID from database
        // since the user object doesn't contain it on initial sign in
        if (!token.id && user?.email) {
          console.log("[JWT] Google OAuth - Fetching user ID for email:", user.email);
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
            console.error("[JWT] Error fetching user ID for Google OAuth:", error);
          }
        }
      }

      console.log("[JWT] Final token - ID:", token.id, "Email:", token.email);
      return token;
    },

    async session({ session, token }) {
      console.log("[SESSION] Token ID:", token.id, "Token email:", token.email);

      try {
        // If token doesn't have ID, try to fetch by email as fallback
        if (!token.id && token.email) {
          console.log("[SESSION] No token.id, trying to fetch by email:", token.email);
          const result = await pool.query(
            "SELECT id, email, name, full_name, role, avatar_url FROM users WHERE email = $1",
            [token.email]
          );

          if (result.rows.length > 0) {
            const user = result.rows[0];
            session.user.id = user.id;
            session.user.role = user.role;
            session.user.name = user.name;
            session.user.fullName = user.full_name;
            session.user.email = user.email;
            session.user.image = user.avatar_url;
            console.log("[SESSION] User found by email, ID:", user.id);
          } else {
            console.error("[SESSION] No user found for email:", token.email);
          }
        } else if (token.id) {
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
            console.error("[SESSION] No user found for ID:", token.id);
          }
        } else {
          console.error("[SESSION] No token.id or token.email available");
        }
      } catch (error) {
        console.error("[SESSION] Error in session callback:", error);
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
