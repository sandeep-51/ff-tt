import type { Registration, InsertRegistration } from "@shared/schema";
import { ticketDb } from "./database";

export interface IStorage {
  createRegistration(data: InsertRegistration): Promise<Registration>;
  getRegistration(id: string): Promise<Registration | undefined>;
  getAllRegistrations(): Promise<Registration[]>;
  generateQRCode(id: string, qrCodeData: string): Promise<boolean>;
  verifyAndScan(ticketId: string): Promise<{ valid: boolean; registration?: Registration; message: string }>;
  getStats(): Promise<{
    totalRegistrations: number;
    qrCodesGenerated: number;
    totalEntries: number;
    activeRegistrations: number;
  }>;
  createEventForm(data: any): Promise<any>;
  getEventForm(id: number): Promise<any>;
  getPublishedForm(): Promise<any>;
  getAllEventForms(): Promise<any[]>;
  updateEventForm(id: number, data: any): Promise<boolean>;
  publishEventForm(id: number): Promise<boolean>;
  unpublishEventForm(id: number): Promise<boolean>;
  deleteEventForm(id: number): Promise<boolean>;
  deleteRegistration(id: string): Promise<boolean>;
  revokeQRCode(id: string): Promise<boolean>;
  getRegistrationsByFormId(formId: number): Promise<Registration[]>;
  getFormStats(formId: number): Promise<any>;
}

export class SqliteStorage implements IStorage {
  async createRegistration(data: InsertRegistration): Promise<Registration> {
    return ticketDb.createRegistration(data);
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    return ticketDb.getRegistration(id);
  }

  async getAllRegistrations(): Promise<Registration[]> {
    return ticketDb.getAllRegistrations();
  }

  async getRegistrationsByFormId(formId: number): Promise<Registration[]> {
    const stmt = db.prepare(`
      SELECT * FROM registrations 
      WHERE formId = ? OR formId IS NULL
      ORDER BY createdAt DESC
    `);
    const rows = stmt.all(formId);
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      organization: row.organization,
      groupSize: row.groupSize,
      scans: row.scans,
      maxScans: row.maxScans,
      hasQR: row.hasQR === 1,
      qrCodeData: row.qrCodeData,
      status: row.status as Registration["status"],
      createdAt: row.createdAt,
    }));
  }

  async getFormStats(formId: number) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as totalRegistrations,
        SUM(CASE WHEN hasQR = 1 THEN 1 ELSE 0 END) as qrCodesGenerated,
        SUM(scans) as totalEntries,
        SUM(CASE WHEN status = 'active' OR status = 'checked-in' THEN 1 ELSE 0 END) as activeRegistrations
      FROM registrations
      WHERE formId = ? OR formId IS NULL
    `);
    const result = stmt.get(formId) as any;
    return {
      totalRegistrations: result?.totalRegistrations || 0,
      qrCodesGenerated: result?.qrCodesGenerated || 0,
      totalEntries: result?.totalEntries || 0,
      activeRegistrations: result?.activeRegistrations || 0,
    };
  }

  async generateQRCode(id: string, qrCodeData: string): Promise<boolean> {
    return ticketDb.generateQRCode(id, qrCodeData);
  }

  async verifyAndScan(ticketId: string): Promise<{ valid: boolean; registration?: Registration; message: string }> {
    return ticketDb.verifyAndScan(ticketId);
  }

  async getStats() {
    return ticketDb.getStats();
  }

  async deleteRegistration(id: string): Promise<boolean> {
    return ticketDb.deleteRegistration(id);
  }

  async revokeQRCode(id: string): Promise<boolean> {
    return ticketDb.revokeQRCode(id);
  }

  async createEventForm(data: any) {
    return ticketDb.createEventForm(data);
  }

  async getEventForm(id: number) {
    return ticketDb.getEventForm(id);
  }

  async getPublishedForm() {
    return ticketDb.getPublishedForm();
  }

  async getAllEventForms() {
    return ticketDb.getAllEventForms();
  }

  async updateEventForm(id: number, data: any) {
    return ticketDb.updateEventForm(id, data);
  }

  async publishEventForm(id: number) {
    return ticketDb.publishEventForm(id);
  }

  async unpublishEventForm(id: number) {
    return ticketDb.unpublishEventForm(id);
  }

  async deleteEventForm(id: number) {
    return ticketDb.deleteEventForm(id);
  }
}

export const storage = new SqliteStorage();