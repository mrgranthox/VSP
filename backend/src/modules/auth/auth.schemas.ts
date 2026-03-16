import { z } from "zod";

const UUIDSchema = z.string().uuid("Must be a valid UUID v4");
const PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be E.164 format e.g. +233201234567");
const EmailSchema = z.string().email().max(255).transform((value) => value.toLowerCase());

const RegisterBody = z
  .object({
    email: EmailSchema.optional(),
    phone: PhoneSchema.optional(),
    password: z
      .string()
      .min(8, "Min 8 characters")
      .max(128)
      .regex(/[A-Z]/, "Requires uppercase")
      .regex(/[0-9]/, "Requires digit")
      .optional(),
    firstName: z.string().min(1).max(100).trim(),
    lastName: z.string().min(1).max(100).trim()
  })
  .strict()
  .refine((data) => data.email || data.phone, { message: "Either email or phone is required" })
  .refine((data) => ((data.email || data.phone) && data.password !== undefined) || !data.password, {
    message: "Password required when registering with email or phone"
  });

const LoginBody = z
  .object({
    email: EmailSchema.optional(),
    phone: PhoneSchema.optional(),
    password: z.string().min(1).max(128)
  })
  .strict()
  .refine((data) => data.email || data.phone, { message: "Email or phone required" });

const RefreshBody = z.object({ refreshToken: z.string().min(1) }).strict();
const LogoutBody = z.object({ sessionId: UUIDSchema.optional() }).strict().default({});

const RequestPasswordResetBody = z
  .object({
    email: EmailSchema.optional(),
    phone: PhoneSchema.optional()
  })
  .strict()
  .refine((data) => data.email || data.phone, { message: "Email or phone required" });

const ResetPasswordBody = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/)
  })
  .strict();

const VerifyEmailBody = z.object({ token: z.string().min(1) }).strict();
const VerifyPhoneBody = z.object({ otp: z.string().length(6).regex(/^\d{6}$/, "Must be 6 digits") }).strict();
const RevokeSessionBody = z.object({ sessionId: UUIDSchema }).strict();
const MFASetupBody = z.object({ method: z.enum(["totp", "sms"]) }).strict();
const MFAVerifyBody = z.object({ method: z.enum(["totp", "sms"]), code: z.string().length(6).regex(/^\d{6}$/) }).strict();
const MFAChallengeRequestBody = z.object({ method: z.literal("sms") }).strict();
const MFAChallengeBody = z
  .object({
    method: z.enum(["totp", "sms", "backup_code"]),
    code: z.string().min(6).max(12)
  })
  .strict();
const MFADisableBody = z
  .object({
    method: z.enum(["totp", "sms", "backup_code"]),
    code: z.string().min(6).max(12)
  })
  .strict();

export {
  LoginBody,
  LogoutBody,
  MFAChallengeBody,
  MFAChallengeRequestBody,
  MFADisableBody,
  MFASetupBody,
  MFAVerifyBody,
  RefreshBody,
  RegisterBody,
  RequestPasswordResetBody,
  ResetPasswordBody,
  RevokeSessionBody,
  VerifyEmailBody,
  VerifyPhoneBody
};
