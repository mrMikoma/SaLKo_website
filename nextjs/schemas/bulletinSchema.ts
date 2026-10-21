import { z } from "zod";

/**
 * A bulletin as the admin writes it; the server actions validate with the
 * same schema
 */
export const bulletinSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Otsikko vaaditaan")
    .max(150, "Otsikko voi olla enintään 150 merkkiä"),
  content: z
    .string()
    .trim()
    .min(1, "Sisältö vaaditaan")
    .max(10000, "Sisältö voi olla enintään 10 000 merkkiä"),
});

export type BulletinInput = z.input<typeof bulletinSchema>;
