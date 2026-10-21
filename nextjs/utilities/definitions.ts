import { z } from "zod";

// The rules every password must meet: login checks them, so a password set
// any other way (new user, reset link) must meet them too
export const PasswordSchema = z
  .string()
  .min(8, { message: "Salasanan on oltava vähintään 8 merkkiä pitkä." })
  .max(32, { message: "Salasanan on oltava enintään 32 merkkiä pitkä." })
  .regex(/[a-zA-Z]/, {
    message: "Salasanassa on oltava vähintään yksi kirjain.",
  })
  .regex(/[0-9]/, { message: "Salasanassa on oltava vähintään yksi numero." })
  .regex(/[^a-zA-Z0-9]/, {
    message: "Salasanassa on oltava vähintään yksi erikoismerkki.",
  })
  .trim();

export const LoginFormSchema = z.object({
  email: z.string().email({ message: "Syötä oikea sähköpostiosoite." }),
  password: PasswordSchema,
});

export type FormState =
  | {
      status: string;
      errors?: {
        general?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export type SessionPayload =
  | {
      userId: string;
      userName: string;
      expiresAt: Date;
    }
  | undefined;

export type UserData = {
  name: string;
  full_name: string;
  email: string;
  roles: string[];
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  auth_provider: string;
};

export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Nykyinen salasana on pakollinen." }),
  newPassword: z
    .string()
    .min(8, { message: "Salasanan on oltava vähintään 8 merkkiä pitkä." })
    .max(32, { message: "Salasanan on oltava enintään 32 merkkiä pitkä." })
    .regex(/[a-zA-Z]/, {
      message: "Salasanassa on oltava vähintään yksi kirjain.",
    })
    .regex(/[0-9]/, { message: "Salasanassa on oltava vähintään yksi numero." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Salasanassa on oltava vähintään yksi erikoismerkki.",
    })
    .trim(),
  confirmPassword: z.string().min(1, { message: "Vahvista salasana." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Salasanat eivät täsmää.",
  path: ["confirmPassword"],
});
