import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
      fullName: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    roles: string[];
    fullName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    roles: string[];
    fullName: string;
    accessToken?: string;
    idToken?: string;
  }
}
