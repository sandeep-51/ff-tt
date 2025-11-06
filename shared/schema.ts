import { z } from "zod";

// Registration schema
export const insertRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  organization: z.string().min(2, "Organization must be at least 2 characters"),
  groupSize: z.number().int().min(1).max(4),
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
  status: "pending" | "active" | "exhausted" | "invalid";
  createdAt: string;
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
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
