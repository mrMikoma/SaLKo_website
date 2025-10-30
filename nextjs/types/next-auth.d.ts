import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user" | "guest";
      fullName: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "admin" | "user" | "guest";
    fullName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "admin" | "user" | "guest";
    fullName: string;
    accessToken?: string;
    idToken?: string;
  }
}
