import { z } from "zod";

// Registration schema
export const insertRegistrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  organization: z.string().min(1, "Organization is required"),
  groupSize: z.number().min(1).max(4),
  formId: z.number().nullable().optional(),
  customFieldData: z.record(z.string()).optional(),
});

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

export interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  groupSize: number;
  scans: number;
  maxScans: number;
  hasQR: boolean;
  qrCodeData: string | null;
  status: "pending" | "active" | "checked-in" | "exhausted" | "invalid";
  createdAt: string;
  customFieldData: Record<string, string>;
}

// Scan history schema
export interface ScanHistory {
  id: string;
  ticketId: string;
  scannedAt: string;
  valid: boolean;
}

// Admin login schema
export const adminLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type AdminLogin = z.infer<typeof adminLoginSchema>;

// Custom field types for event forms
export const customFieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "email", "phone", "textarea", "url", "photo"]),
  label: z.string().min(1, "Label is required"),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

// Event form schema
export const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  heroImageUrl: z.string().optional(),
  watermarkUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  customLinks: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).optional(),
  description: z.string().optional(),
  customFields: z.array(customFieldSchema).optional(),
});

export type EventFormInput = z.infer<typeof eventFormSchema>;

export interface EventForm {
  id: number;
  title: string;
  subtitle: string | null;
  heroImageUrl: string | null;
  watermarkUrl: string | null;
  logoUrl: string | null;
  customLinks: Array<{ label: string; url: string }>;
  description: string | null;
  customFields: CustomField[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}