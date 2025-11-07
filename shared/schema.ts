import { z } from "zod";

// Team member schema
export const teamMemberSchema = z.object({
  name: z.string().min(1, "Member name is required"),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

// Registration schema - flexible to support optional fields
export const insertRegistrationSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  groupSize: z.number().min(1).max(4).optional(),
  formId: z.number().nullable().optional(),
  customFieldData: z.record(z.string()).optional(),
  teamMembers: z.array(teamMemberSchema).optional(),
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
  teamMembers?: TeamMember[];
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
  type: z.enum(["text", "email", "phone", "url", "textarea", "photo", "payment"]),
  label: z.string().min(1, "Label is required"),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  paymentUrl: z.string().optional(), // For payment link field - allow any string, validate as URL in form builder
  helpText: z.string().optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

// Base field configuration
export const baseFieldConfigSchema = z.object({
  label: z.string().min(1, "Label is required"),
  placeholder: z.string().optional(),
  required: z.boolean().default(true),
  enabled: z.boolean().default(true),
  maxTeamMembers: z.number().min(1).max(20).optional(),
  helpText: z.string().optional(),
});

export type BaseFieldConfig = z.infer<typeof baseFieldConfigSchema>;

// Event form schema
export const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  heroImageUrl: z.string().optional(),
  backgroundImageUrl: z.string().optional(),
  watermarkUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  customLinks: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).optional(),
  description: z.string().optional(),
  customFields: z.array(customFieldSchema).optional(),
  baseFields: z.object({
    name: baseFieldConfigSchema.optional(),
    email: baseFieldConfigSchema.optional(),
    phone: baseFieldConfigSchema.optional(),
    organization: baseFieldConfigSchema.optional(),
    groupSize: baseFieldConfigSchema.optional(),
  }).optional(),
  successMessage: z.string().optional(),
  successTitle: z.string().optional(),
});

export type EventFormInput = z.infer<typeof eventFormSchema>;

export interface EventForm {
  id: number;
  title: string;
  subtitle: string | null;
  heroImageUrl: string | null;
  backgroundImageUrl: string | null;
  watermarkUrl: string | null;
  logoUrl: string | null;
  customLinks: Array<{ label: string; url: string }>;
  description: string | null;
  customFields: CustomField[];
  baseFields?: {
    name?: BaseFieldConfig;
    email?: BaseFieldConfig;
    phone?: BaseFieldConfig;
    organization?: BaseFieldConfig;
    groupSize?: BaseFieldConfig;
  };
  successMessage: string | null;
  successTitle: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}