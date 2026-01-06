"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { LoginFormSchema } from "@/utilities/definitions";

export interface LoginState {
  errors?: {
    email?: string[];
    password?: string[];
    general?: string[];
  };
  status?: "success" | "error";
}

/**
 * Server action for credentials login
 */
export async function loginWithCredentials(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  // Validate form data
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors as {
        email?: string[];
        password?: string[];
      },
      status: "error",
    };
  }

  const { email, password } = validatedFields.data;

  try {
    // Use signIn with redirectTo to handle the authentication
    // NextAuth will throw NEXT_REDIRECT on success, which is expected
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });

    // This line should not be reached if login is successful
    // (NextAuth redirects by throwing NEXT_REDIRECT)
    return { status: "success" };
  } catch (error) {
    // Check if it's a redirect (which means successful login)
    if (error && typeof error === "object" && "digest" in error) {
      const digest = (error as any).digest;
      if (typeof digest === "string" && digest.includes("NEXT_REDIRECT")) {
        // This is a successful redirect, re-throw it
        throw error;
      }
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            errors: {
              general: ["Virheellinen sähköpostiosoite tai salasana."],
            },
            status: "error",
          };
        default:
          return {
            errors: {
              general: ["Kirjautuminen epäonnistui. Yritä uudelleen."],
            },
            status: "error",
          };
      }
    }
    // Re-throw unknown errors
    throw error;
  }
}

/**
 * Server action for Google OAuth login
 */
export async function loginWithGoogle() {
  try {
    await signIn("google", {
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("Google login error:", error);
      throw error;
    }
    throw error;
  }
}

/**
 * Server action for logout
 */
export async function logout() {
  // Note: signOut() throws NEXT_REDIRECT which is Next.js's way of handling redirects
  // We should not catch this as an error - just let it propagate
  await signOut({
    redirectTo: "/",
  });
}
