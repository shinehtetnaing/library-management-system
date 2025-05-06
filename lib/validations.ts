import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().trim().min(3),
  email: z.string().trim().email(),
  universityId: z.coerce.number(),
  universityCard: z.string().trim().nonempty("University card is required"),
  password: z.string().trim().min(8),
});

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(8),
});
