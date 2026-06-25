import { z } from "zod";

export const appointmentCreateSchema = z.object({
  serviceId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  customerPhone: z
    .string()
    .min(9, "מספר טלפון לא תקין")
    .regex(/^[\d\-+()\s]+$/, "מספר טלפון לא תקין"),
  customerEmail: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? "")
    .refine(
      (v) => v === "" || z.string().email().safeParse(v).success,
      "כתובת אימייל לא תקינה"
    ),
  notes: z.string().optional(),
  inspoIds: z.array(z.number().int()).optional().default([]),
});

export const appointmentUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.coerce.number().int().positive(),
});

export const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMin: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const inspoSchema = z.object({
  src: z.string().url(),
  label: z.string().min(1),
  tags: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const loginSchema = z.object({
  password: z.string().min(1),
});

export const settingsPatchSchema = z.object({
  settings: z.record(z.string(), z.string()).optional(),
  workingHours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        isOpen: z.boolean(),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .optional(),
  blockedDates: z
    .array(
      z.object({
        date: z.string(),
        reason: z.string().optional(),
      })
    )
    .optional(),
  removeBlockedDate: z.string().optional(),
});

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
