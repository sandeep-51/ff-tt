import type { Registration, InsertRegistration, EventForm, EventFormInput } from "@shared/schema";

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
  deleteRegistration(id: string): Promise<boolean>;
  revokeQRCode(id: string): Promise<boolean>;
  updateRegistration(id: string, data: Partial<InsertRegistration>): Promise<boolean>;
  getRegistrationsByFormId(formId: number, limit?: number, offset?: number): Promise<Registration[]>;
  getRegistrationsByFormIdCount(formId: number): Promise<number>;
  getFormStats(formId: number): Promise<any>;
}

class MemStorage implements IStorage {
  private registrations: Map<string, Registration> = new Map();
  private eventForms: Map<number, EventForm> = new Map();
  private nextFormId: number = 1;
  private scanHistory: Array<{ id: string; ticketId: string; scannedAt: string; valid: boolean }> = [];

  private generateTicketId(): string {
    return `REG${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
  }

  async createRegistration(data: InsertRegistration): Promise<Registration> {
    const id = this.generateTicketId();
    const groupSize = data.groupSize || 1;
    const maxScans = groupSize * 1;

    const registration: Registration = {
      id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      organization: data.organization || '',
      groupSize,
      scans: 0,
      maxScans,
      hasQR: false,
      qrCodeData: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      formId: data.formId ?? null,
      customFieldData: data.customFieldData || {},
      teamMembers: data.teamMembers || [],
    };

    this.registrations.set(id, registration);
    return registration;
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    return this.registrations.get(id);
  }

  async getAllRegistrations(limit?: number, offset?: number): Promise<Registration[]> {
    const allRegs = Array.from(this.registrations.values());
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return allRegs.slice(start, end);
  }

  async getRegistrationsCount(): Promise<number> {
    return this.registrations.size;
  }

  async getRegistrationsByFormId(formId: number, limit?: number, offset?: number): Promise<Registration[]> {
    const filtered = Array.from(this.registrations.values()).filter(
      (r) => r.formId === formId
    );
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return filtered.slice(start, end);
  }

  async getRegistrationsByFormIdCount(formId: number): Promise<number> {
    return Array.from(this.registrations.values()).filter(
      (r) => r.formId === formId
    ).length;
  }

  async getFormStats(formId: number) {
    const regs = await this.getRegistrationsByFormId(formId);
    return {
      totalRegistrations: regs.length,
      qrCodesGenerated: regs.filter((r) => r.hasQR).length,
      totalEntries: regs.filter((r) => r.status === 'checked-in').length,
      activeRegistrations: regs.filter((r) => r.status === 'active' || r.status === 'pending').length,
    };
  }

  async generateQRCode(id: string, qrCodeData: string): Promise<boolean> {
    const reg = this.registrations.get(id);
    if (!reg) return false;

    reg.hasQR = true;
    reg.qrCodeData = qrCodeData;
    reg.status = 'active';
    this.registrations.set(id, reg);
    return true;
  }

  async verifyAndScan(ticketId: string): Promise<{ valid: boolean; registration?: Registration; message: string }> {
    const registration = this.registrations.get(ticketId);

    if (!registration) {
      return { valid: false, message: "Invalid ticket - not found" };
    }

    if (!registration.hasQR) {
      return { valid: false, registration, message: "QR code not generated yet" };
    }

    if (registration.status === "exhausted") {
      return { valid: false, registration, message: "Ticket exhausted - max scans reached" };
    }

    if (registration.scans >= registration.maxScans) {
      registration.status = "exhausted";
      this.registrations.set(ticketId, registration);
      return { valid: false, registration, message: "Maximum scans reached" };
    }

    registration.scans += 1;
    registration.status = registration.scans >= registration.maxScans ? "exhausted" : "checked-in";
    this.registrations.set(ticketId, registration);

    this.scanHistory.push({
      id: `SCAN${Date.now()}`,
      ticketId,
      scannedAt: new Date().toISOString(),
      valid: true,
    });

    return {
      valid: true,
      registration,
      message: `Valid! ${registration.scans}/${registration.maxScans} scans used`,
    };
  }

  async getStats() {
    const allRegs = Array.from(this.registrations.values());
    return {
      totalRegistrations: allRegs.length,
      qrCodesGenerated: allRegs.filter((r) => r.hasQR).length,
      totalEntries: allRegs.filter((r) => r.status === 'checked-in' || r.status === 'exhausted').length,
      activeRegistrations: allRegs.filter((r) => r.status === 'active' || r.status === 'pending').length,
    };
  }

  async deleteRegistration(id: string): Promise<boolean> {
    return this.registrations.delete(id);
  }

  async revokeQRCode(id: string): Promise<boolean> {
    const reg = this.registrations.get(id);
    if (!reg) return false;

    reg.hasQR = false;
    reg.qrCodeData = null;
    reg.status = 'pending';
    reg.scans = 0;
    this.registrations.set(id, reg);
    return true;
  }

  async updateRegistration(id: string, data: Partial<InsertRegistration>): Promise<boolean> {
    const reg = this.registrations.get(id);
    if (!reg) return false;

    Object.assign(reg, data);
    this.registrations.set(id, reg);
    return true;
  }

  async createEventForm(data: any): Promise<any> {
    const id = this.nextFormId++;
    const form: EventForm = {
      id,
      title: data.title,
      subtitle: data.subtitle || null,
      heroImageUrl: data.heroImageUrl || null,
      backgroundImageUrl: data.backgroundImageUrl || null,
      watermarkUrl: data.watermarkUrl || null,
      logoUrl: data.logoUrl || null,
      customLinks: data.customLinks || [],
      description: data.description || null,
      customFields: data.customFields || [],
      baseFields: data.baseFields || {},
      successMessage: data.successMessage || null,
      successTitle: data.successTitle || null,
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.eventForms.set(id, form);
    return form;
  }

  async getEventForm(id: number): Promise<any> {
    return this.eventForms.get(id) || null;
  }

  async getPublishedForm(): Promise<any> {
    const forms = Array.from(this.eventForms.values());
    return forms.find((f) => f.isPublished) || null;
  }

  async getAllEventForms(): Promise<any[]> {
    return Array.from(this.eventForms.values());
  }

  async updateEventForm(id: number, data: any): Promise<boolean> {
    const form = this.eventForms.get(id);
    if (!form) return false;

    Object.assign(form, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    this.eventForms.set(id, form);
    return true;
  }

  async publishEventForm(id: number): Promise<boolean> {
    const form = this.eventForms.get(id);
    if (!form) return false;

    // Unpublish all other forms
    Array.from(this.eventForms.values()).forEach(f => {
      f.isPublished = false;
    });

    form.isPublished = true;
    this.eventForms.set(id, form);
    return true;
  }

  async unpublishEventForm(id: number): Promise<boolean> {
    const form = this.eventForms.get(id);
    if (!form) return false;

    form.isPublished = false;
    this.eventForms.set(id, form);
    return true;
  }

  async deleteEventForm(id: number): Promise<boolean> {
    return this.eventForms.delete(id);
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
    const PDFDocument = require('pdfkit');
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
    const XLSX = require('xlsx');

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

export const storage = new MemStorage();
