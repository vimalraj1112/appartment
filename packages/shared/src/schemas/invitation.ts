import { z } from "zod";
import { ROLES } from "../enums.js";
import { emailSchema, passwordSchema } from "./auth.js";

export const invitationCreateSchema = z
  .object({
    email: emailSchema.optional(),
    phone: z.string().trim().min(6).max(20).optional(),
    role: z.enum(ROLES),
    flatId: z.string().uuid().optional(),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Provide an email address or phone number",
    path: ["email"],
  });
export type InvitationCreateInput = z.infer<typeof invitationCreateSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(10, "Invalid invitation token"),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  password: passwordSchema,
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
