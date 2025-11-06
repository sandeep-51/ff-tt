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