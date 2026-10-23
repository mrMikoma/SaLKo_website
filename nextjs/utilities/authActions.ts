"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { LoginFormSchema } from "@/utilities/definitions";
import { safeRedirect } from "@/utilities/safeRedirect";
import { clientIp, waitText } from "@/utilities/rateLimit";
import { loginBlockedFor, TOO_MANY_ATTEMPTS } from "@/utilities/loginLimits";
import { headers } from "next/headers";

export interface LoginState {
  errors?: {
    email?: string[];
    password?: string[];
    general?: string[];
  };
  status?: "success" | "error";
  // What was typed, so the form keeps it after a failed attempt
  email?: string;
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
      email: String(formData.get("email") ?? ""),
    };
  }

  const { email, password } = validatedFields.data;

  try {
    // Use signIn with redirectTo to handle the authentication
    // NextAuth will throw NEXT_REDIRECT on success, which is expected
    await signIn("credentials", {
      email,
      password,
      // Back to the page the login was opened from, e.g. the booking calendar
      redirectTo: safeRedirect(formData.get("redirectTo")),
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
      // Too many failed logins (auth.ts): say how long to wait
      if ((error as AuthError & { code?: string }).code === TOO_MANY_ATTEMPTS) {
        const wait = loginBlockedFor(email, clientIp(await headers()));
        return {
          errors: {
            general: [
              `Liian monta epäonnistunutta kirjautumista. Yritä uudelleen ${waitText(wait)} kuluttua.`,
            ],
          },
          status: "error",
          email,
        };
      }
      switch (error.type) {
        case "CredentialsSignin":
          return {
            errors: {
              general: ["Virheellinen sähköpostiosoite tai salasana."],
            },
            status: "error",
            email,
          };
        default:
          return {
            errors: {
              general: ["Kirjautuminen epäonnistui. Yritä uudelleen."],
            },
            status: "error",
            email,
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
export async function loginWithGoogle(formData?: FormData) {
  try {
    await signIn("google", {
      redirectTo: safeRedirect(formData?.get("redirectTo")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("Google login error:", error);
      throw error;
    }
    throw error;
  }
}

