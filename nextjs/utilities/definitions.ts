import { z } from "zod";

export const LoginFormSchema = z.object({
  email: z.string().email({ message: "Syötä oikea sähköpostiosoite." }),
  password: z
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
      expiresAt: Date;
    }
  | undefined;
