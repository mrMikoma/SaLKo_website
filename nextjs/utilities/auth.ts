"use server";

import { LoginFormSchema, FormState } from "@/utilities/definitions";
import connectionPool from "@/utilities/db";
import { createSession, deleteSession } from "@/utilities/sessions";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";

const SALT_ROUNDS = 10;

export async function login(state: FormState, formData: FormData) {
  try {
    console.log("Kirjautumispyyntö vastaanotettu");
    // Validate form fields
    const validatedFields = LoginFormSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    // If any form fields are invalid, return early with detailed errors
    if (!validatedFields.success) {
      return {
        status: "validation_error",
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Virheellinen lomaketieto. Tarkista syöttökentät.",
      };
    }

    // Fetch user data from the database
    const { email, password } = validatedFields.data;
    const userData = await connectionPool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    // If no user found, return an error
    if (userData.rowCount === 0) {
      return {
        status: "error",
        errors: {
          general: ["Sähköposti tai salasana on väärin."],
        },
        message: "Sähköposti tai salasana on väärin.",
      };
    }
    const user = userData.rows[0];

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = password === user.password; // await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        status: "error",
        errors: {
          general: ["Sähköposti tai salasana on väärin."],
        },
        message: "Sähköposti tai salasana on väärin.",
      };
    }

    // Create a session for the user
    await createSession(user.id);

    console.log("Kirjautuminen onnistui käyttäjälle:", user.email);

    // If the password is valid, return success
    return {
      status: "success",
      message: "Kirjautuminen onnistui.",
    };
  } catch (error) {
    console.error("Odottamaton virhe:", error);
    return {
      status: "error",
      message: "Tapahtui odottamaton virhe. Yritä myöhemmin uudelleen.",
      error: error instanceof Error ? error.message : "Tuntematon virhe",
    };
  }
}

export async function logout() {
  try {
    console.log("Kirjautumisen poisto käynnissä");
    await deleteSession();
    console.log("Kirjautuminen poistettu onnistuneesti");
  } catch (error) {
    console.error("Virhe kirjautumisen poistamisessa:", error);
  }
}
