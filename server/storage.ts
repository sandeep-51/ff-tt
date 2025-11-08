import type { Registration, InsertRegistration } from "@shared/schema";
import { ticketDb } from "./mongodb";

export interface ScanHistory {
  id: string;
  ticketId: string;
  timestamp: Date;
  // Add any other relevant fields for scan history
}

export interface IStorage {
  createRegistration(data: InsertRegistration): Promise<Registration>;
  getRegistration(id: string): Promise<Registration | undefined>;
  getAllRegistrations(limit?: number, offset?: number): Promise<Registration[]>;
  getRegistrationsCount(): Promise<number>;
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
  getScanHistory(limit?: number): Promise<ScanHistory[]>;
  getScanHistoryByTicketId(ticketId: string): Promise<ScanHistory[]>;
  exportToCSV(registrations: Registration[]): string;
  exportToPDF(registrations: Registration[]): Promise<Buffer>;
  exportToExcel(registrations: Registration[]): Buffer;
}

export class SqliteStorage implements IStorage {
  async createRegistration(data: InsertRegistration): Promise<Registration> {
    return ticketDb.createRegistration(data);
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    return ticketDb.getRegistration(id);
  }

  async getAllRegistrations(limit?: number, offset?: number): Promise<Registration[]> {
    return ticketDb.getAllRegistrations(limit, offset);
  }

  async getRegistrationsCount(): Promise<number> {
    return ticketDb.getRegistrationsCount();
  }

  async getRegistrationsByFormId(formId: number, limit?: number, offset?: number): Promise<Registration[]> {
    return ticketDb.getRegistrationsByFormId(formId, limit, offset);
  }

  async getRegistrationsByFormIdCount(formId: number): Promise<number> {
    return ticketDb.getRegistrationsByFormIdCount(formId);
  }

  async getFormStats(formId: number) {
    return ticketDb.getFormStats(formId);
  }

  async generateQRCode(id: string, qrCodeData: string): Promise<boolean> {
    return ticketDb.generateQRCode(id, qrCodeData);
  }

  async verifyAndScan(ticketId: string): Promise<{ valid: boolean; registration?: Registration; message: string }> {
    const registration = await ticketDb.getRegistration(ticketId);

    if (!registration) {
      return { valid: false, message: "Ticket not found." };
    }

    if (registration.scans >= registration.maxScans) {
      return { valid: false, message: "This ticket has reached its maximum scan limit." };
    }

    // Update scan count and status
    const newScans = registration.scans + 1;
    // Once checked-in, keep status as checked-in permanently
    const newStatus = registration.status === "checked-in" ? "checked-in" : "checked-in";

    // Save scan history
    await ticketDb.createScanHistory({ ticketId, timestamp: new Date(), /* other fields */ });

    await ticketDb.updateRegistration(ticketId, {
      scans: newScans,
      status: newStatus
    });

    return {
      valid: true,
      registration: { ...registration, scans: newScans, status: newStatus },
      message: "Ticket verified and scanned successfully."
    };
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

  async updateRegistration(id: string, data: Partial<InsertRegistration>): Promise<boolean> {
    return ticketDb.updateRegistration(id, data);
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

  async getScanHistory(limit?: number): Promise<ScanHistory[]> {
    return ticketDb.getScanHistory(limit);
  }

  async getScanHistoryByTicketId(ticketId: string): Promise<ScanHistory[]> {
    return ticketDb.getScanHistoryByTicketId(ticketId);
  }

  exportToCSV(registrations: Registration[]): string {
    const allCustomFieldKeys = new Set<string>();
    registrations.forEach(r => {
      if (r.customFieldData && Object.keys(r.customFieldData).length > 0) {
        Object.keys(r.customFieldData).forEach(key => allCustomFieldKeys.add(key));
      }
    });

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Organization', 'Group Size', 'Scans', 'Max Scans', 'Has QR', 'Status', 'Created At', 'Team Members', ...Array.from(allCustomFieldKeys)];
    const rows = registrations.map(r => {
      const teamMembersStr = r.teamMembers && r.teamMembers.length > 0
        ? r.teamMembers.map(m => `${m.name} (${m.email || 'N/A'})`).join('; ')
        : '';

      const baseRow = [
        r.id,
        r.name,
        r.email,
        r.phone,
        r.organization,
        r.groupSize.toString(),
        r.scans.toString(),
        r.maxScans.toString(),
        r.hasQR ? 'Yes' : 'No',
        r.status,
        r.createdAt,
        teamMembersStr
      ];

      const customFieldValues = Array.from(allCustomFieldKeys).map(key => {
        return (r.customFieldData && r.customFieldData[key]) || '';
      });

      return [...baseRow, ...customFieldValues];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  async exportToPDF(registrations: Registration[]): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text('Event Registration Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Total Registrations: ${registrations.length}`);
      doc.text(`QR Codes Generated: ${registrations.filter(r => r.hasQR).length}`);
      doc.text(`Total Check-ins: ${registrations.filter(r => r.status === 'checked-in').length}`);
      doc.moveDown(2);

      // Registrations list
      doc.fontSize(14).text('Registrations', { underline: true });
      doc.moveDown(0.5);

      registrations.forEach((reg, index) => {
        if (index > 0) doc.moveDown(1);

        doc.fontSize(11);
        doc.text(`${index + 1}. ${reg.name} (${reg.id})`);
        doc.fontSize(9);
        doc.text(`   Email: ${reg.email}`);
        doc.text(`   Phone: ${reg.phone}`);
        doc.text(`   Organization: ${reg.organization}`);
        doc.text(`   Group Size: ${reg.groupSize} | Scans: ${reg.scans}/${reg.maxScans} | Status: ${reg.status}`);

        if (reg.teamMembers && reg.teamMembers.length > 0) {
          doc.text(`   Team Members:`);
          reg.teamMembers.forEach((member, idx) => {
            doc.text(`     ${idx + 1}. ${member.name}${member.email ? ` (${member.email})` : ''}${member.phone ? ` - ${member.phone}` : ''}`);
          });
        }

        if (reg.customFieldData && Object.keys(reg.customFieldData).length > 0) {
          Object.entries(reg.customFieldData).forEach(([key, value]) => {
            const displayValue = String(value).startsWith('/attached_assets/')
              ? `[Photo: ${value}]`
              : value;
            doc.text(`   ${key}: ${displayValue}`);
          });
        }
      });

      doc.end();
    });
  }

  exportToExcel(registrations: Registration[]): Buffer {
    const XLSX = require('xlsx') as typeof import('xlsx');

    const rows = registrations.map((r) => {
      const teamMembersStr = r.teamMembers && r.teamMembers.length > 0
        ? r.teamMembers.map(m => `${m.name}${m.email ? ` (${m.email})` : ''}${m.phone ? ` - ${m.phone}` : ''}`).join('; ')
        : '';

      const row: any = {
        ID: r.id,
        Name: r.name,
        Email: r.email,
        Phone: r.phone,
        Organization: r.organization,
        'Group Size': r.groupSize,
        'Scans Used': r.scans,
        'Max Scans': r.maxScans,
        'Has QR': r.hasQR ? 'Yes' : 'No',
        Status: r.status,
        'Created At': r.createdAt,
        'Team Members': teamMembersStr,
      };

      if (r.customFieldData && Object.keys(r.customFieldData).length > 0) {
        Object.entries(r.customFieldData).forEach(([key, value]) => {
          row[key] = value;
        });
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

export const storage = ticketDb;