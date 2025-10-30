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
  prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  // Validate form data
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      status: "error",
    };
  }

  const { email, password } = validatedFields.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
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
  try {
    await signOut({
      redirectTo: "/",
    });
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
