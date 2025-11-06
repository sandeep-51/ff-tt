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

  async generateQRCode(id: string, qrCodeData: string): Promise<boolean> {
    return ticketDb.generateQRCode(id, qrCodeData);
  }

  async verifyAndScan(ticketId: string): Promise<{ valid: boolean; registration?: Registration; message: string }> {
    return ticketDb.verifyAndScan(ticketId);
  }

  async getStats() {
    return ticketDb.getStats();
  }
}

export const storage = new SqliteStorage();
