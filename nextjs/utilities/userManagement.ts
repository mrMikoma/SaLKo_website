"use server";

import { auth } from "@/auth";
import pool from "@/utilities/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcrypt";
import { ChangePasswordSchema } from "./definitions";

// Validation schema for profile updates
const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, "Koko nimi vaaditaan"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
});

export interface UpdateProfileState {
  errors?: {
    full_name?: string[];
    phone?: string[];
    address?: string[];
    city?: string[];
    postal_code?: string[];
    general?: string[];
  };
  status?: "success" | "error";
  message?: string;
}

/**
 * Server action to update user profile
 */
export async function updateProfile(
  _prevState: UpdateProfileState | undefined,
  formData: FormData
): Promise<UpdateProfileState> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        errors: {
          general: ["Ei oikeuksia. Kirjaudu sisään."],
        },
        status: "error",
      };
    }

    // Validate form data
    const validatedFields = UpdateProfileSchema.safeParse({
      full_name: formData.get("full_name"),
      phone: formData.get("phone") || null,
      address: formData.get("address") || null,
      city: formData.get("city") || null,
      postal_code: formData.get("postal_code") || null,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        status: "error",
      };
    }

    const { full_name, phone, address, city, postal_code } =
      validatedFields.data;

    // Update user profile in database
    await pool.query(
      "UPDATE users SET full_name = $1, phone = $2, address = $3, city = $4, postal_code = $5 WHERE id = $6",
      [full_name, phone, address, city, postal_code, session.user.id]
    );

    // Revalidate the profile page
    revalidatePath("/jasenalue/profiili");

    return {
      status: "success",
      message: "Profiili päivitetty onnistuneesti",
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return {
      errors: {
        general: ["Profiilin päivitys epäonnistui. Yritä uudelleen."],
      },
      status: "error",
    };
  }
}

/**
 * Check if user profile is complete
 */
export async function isProfileComplete(): Promise<boolean> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return false;
    }

    const result = await pool.query(
      "SELECT phone, address, city, postal_code FROM users WHERE id = $1",
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const user = result.rows[0];

    // Check if all optional contact fields are filled
    return !!(user.phone && user.address && user.city && user.postal_code);
  } catch (error) {
    console.error("Error checking profile completion:", error);
    return false;
  }
}

export interface ChangePasswordState {
  errors?: {
    currentPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
    general?: string[];
  };
  status?: "success" | "error";
  message?: string;
}

/**
 * Server action to change user password
 * Only works for users with credentials auth provider
 */
export async function changePassword(
  _prevState: ChangePasswordState | undefined,
  formData: FormData
): Promise<ChangePasswordState> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        errors: {
          general: ["Ei oikeuksia. Kirjaudu sisään."],
        },
        status: "error",
      };
    }

    // Validate form data
    const validatedFields = ChangePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        status: "error",
      };
    }

    const { currentPassword, newPassword } = validatedFields.data;

    // Get user from database
    const result = await pool.query(
      "SELECT password, auth_provider FROM users WHERE id = $1",
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return {
        errors: {
          general: ["Käyttäjää ei löytynyt."],
        },
        status: "error",
      };
    }

    const user = result.rows[0];

    // Check if user has credentials auth provider
    if (user.auth_provider !== "credentials") {
      return {
        errors: {
          general: [
            "Salasanan vaihto ei ole mahdollista Google Workspace -tunnuksille.",
          ],
        },
        status: "error",
      };
    }

    // Verify current password
    if (!user.password) {
      return {
        errors: {
          general: ["Käyttäjällä ei ole salasanaa asetettuna."],
        },
        status: "error",
      };
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isValidPassword) {
      return {
        errors: {
          currentPassword: ["Nykyinen salasana on virheellinen."],
        },
        status: "error",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      session.user.id,
    ]);

    return {
      status: "success",
      message: "Salasana vaihdettu onnistuneesti",
    };
  } catch (error) {
    console.error("Error changing password:", error);
    return {
      errors: {
        general: ["Salasanan vaihto epäonnistui. Yritä uudelleen."],
      },
      status: "error",
    };
  }
}
