import { MongoClient, Db, ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import type { Registration, InsertRegistration, ScanHistory } from "@shared/schema";

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || "event_registration";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required. Please set it in your environment or .env file.");
}

let client: MongoClient;
let db: Db;

async function connectToDatabase() {
  if (!client) {
    try {
      console.log("🔄 Connecting to MongoDB...");
      console.log("📍 URI:", MONGODB_URI!.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password in logs
      console.log("📦 Database:", DATABASE_NAME);

      client = new MongoClient(MONGODB_URI!);
      await client.connect();
      db = client.db(DATABASE_NAME);

      // Create indexes
      await db.collection("registrations").createIndex({ email: 1 });
      await db.collection("registrations").createIndex({ status: 1 });
      await db.collection("registrations").createIndex({ formId: 1 });
      await db.collection("scan_history").createIndex({ ticketId: 1 });
      await db.collection("event_forms").createIndex({ isPublished: 1 });
      await db.collection("event_forms").createIndex({ id: 1 });

      console.log("✅ Connected to MongoDB successfully!");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }
  return db;
}

export class TicketDatabase {
  private async getDb() {
    if (!db) {
      await connectToDatabase();
    }
    return db;
  }

  private generateTicketId(): string {
    return `REG${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
  }

  async createRegistration(data: InsertRegistration): Promise<Registration> {
    const database = await this.getDb();
    const id = this.generateTicketId();
    const groupSize = data.groupSize || 1;
    const maxScans = groupSize * 1;

    const registration = {
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

    await database.collection("registrations").insertOne(registration);
    return registration as Registration;
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const database = await this.getDb();
    const registration = await database.collection("registrations").findOne({ id });
    return registration as unknown as Registration | undefined;
  }

  async getAllRegistrations(limit?: number, offset?: number): Promise<Registration[]> {
    const database = await this.getDb();
    const query = database.collection("registrations").find({});
    
    if (offset) {
      query.skip(offset);
    }
    if (limit) {
      query.limit(limit);
    }

    const registrations = await query.toArray();
    return registrations as unknown as Registration[];
  }

  async getRegistrationsCount(): Promise<number> {
    const database = await this.getDb();
    return await database.collection("registrations").countDocuments({});
  }

  async getRegistrationsByFormId(formId: number, limit?: number, offset?: number): Promise<Registration[]> {
    const database = await this.getDb();
    const query = database.collection("registrations").find({ formId });
    
    if (offset) {
      query.skip(offset);
    }
    if (limit) {
      query.limit(limit);
    }

    const registrations = await query.toArray();
    return registrations as unknown as Registration[];
  }

  async getRegistrationsByFormIdCount(formId: number): Promise<number> {
    const database = await this.getDb();
    return await database.collection("registrations").countDocuments({ formId });
  }

  async getFormStats(formId: number) {
    const database = await this.getDb();
    const registrations = await database.collection("registrations").find({ formId }).toArray();
    
    return {
      totalRegistrations: registrations.length,
      qrCodesGenerated: registrations.filter((r: any) => r.hasQR).length,
      totalEntries: registrations.filter((r: any) => r.status === 'checked-in' || r.status === 'exhausted').length,
      activeRegistrations: registrations.filter((r: any) => r.status === 'active' || r.status === 'pending').length,
    };
  }

  async generateQRCode(id: string, qrCodeData: string): Promise<boolean> {
    const database = await this.getDb();
    const result = await database.collection("registrations").updateOne(
      { id },
      { $set: { hasQR: true, qrCodeData, status: 'active' } }
    );
    return result.modifiedCount > 0;
  }

  async verifyAndScan(ticketId: string): Promise<{ valid: boolean; registration?: Registration; message: string }> {
    const database = await this.getDb();
    const registration = await database.collection("registrations").findOne({ id: ticketId });

    if (!registration) {
      return { valid: false, message: "Invalid ticket - not found" };
    }

    if (!registration.hasQR) {
      return { valid: false, registration: registration as unknown as Registration, message: "QR code not generated yet" };
    }

    if (registration.scans >= registration.maxScans) {
      return { valid: false, registration: registration as unknown as Registration, message: "Maximum scans reached" };
    }

    const newScans = registration.scans + 1;
    // Once checked-in, always keep status as checked-in
    const newStatus = registration.status === "checked-in" ? "checked-in" : "checked-in";

    await database.collection("registrations").updateOne(
      { id: ticketId },
      { $set: { scans: newScans, status: newStatus } }
    );

    registration.scans = newScans;
    registration.status = newStatus;

    await database.collection("scan_history").insertOne({
      id: nanoid(),
      ticketId,
      scannedAt: new Date().toISOString(),
      valid: true,
    });

    return {
      valid: true,
      registration: registration as unknown as Registration,
      message: `Valid! ${newScans}/${registration.maxScans} scans used`,
    };
  }

  async getStats() {
    const database = await this.getDb();
    const registrations = await database.collection("registrations").find({}).toArray();

    return {
      totalRegistrations: registrations.length,
      qrCodesGenerated: registrations.filter((r: any) => r.hasQR).length,
      totalEntries: registrations.filter((r: any) => r.status === 'checked-in' || r.status === 'exhausted').length,
      activeRegistrations: registrations.filter((r: any) => r.status === 'active' || r.status === 'pending').length,
    };
  }

  async deleteRegistration(id: string): Promise<boolean> {
    const database = await this.getDb();
    const result = await database.collection("registrations").deleteOne({ id });
    return result.deletedCount > 0;
  }

  async revokeQRCode(id: string): Promise<boolean> {
    const database = await this.getDb();
    const result = await database.collection("registrations").updateOne(
      { id },
      { $set: { hasQR: false, qrCodeData: null, status: 'pending', scans: 0 } }
    );
    return result.modifiedCount > 0;
  }

  async updateRegistration(id: string, data: Partial<InsertRegistration>): Promise<boolean> {
    const database = await this.getDb();
    const result = await database.collection("registrations").updateOne(
      { id },
      { $set: data }
    );
    return result.modifiedCount > 0;
  }

  async createEventForm(data: any): Promise<any> {
    const database = await this.getDb();
    
    // Get the highest id value
    const lastForm = await database.collection("event_forms")
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    
    const nextId = lastForm.length > 0 ? lastForm[0].id + 1 : 1;

    const form = {
      id: nextId,
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

    await database.collection("event_forms").insertOne(form);
    return form;
  }

  async getEventForm(id: number): Promise<any> {
    const database = await this.getDb();
    const form = await database.collection("event_forms").findOne({ id });
    return form;
  }

  async getPublishedForm(): Promise<any> {
    const database = await this.getDb();
    const form = await database.collection("event_forms").findOne({ isPublished: true });
    return form;
  }

  async getAllEventForms(): Promise<any[]> {
    const database = await this.getDb();
    const forms = await database.collection("event_forms").find({}).toArray();
    return forms;
  }

  async updateEventForm(id: number, data: any): Promise<boolean> {
    const database = await this.getDb();
    const result = await database.collection("event_forms").updateOne(
      { id },
      { $set: { ...data, updatedAt: new Date().toISOString() } }
    );
    return result.modifiedCount > 0;
  }

  async publishEventForm(id: number): Promise<boolean> {
    const database = await this.getDb();
    
    // Unpublish all other forms
    await database.collection("event_forms").updateMany(
      {},
      { $set: { isPublished: false } }
    );

    // Publish the selected form
    const result = await database.collection("event_forms").updateOne(
      { id },
      { $set: { isPublished: true } }
    );

    return result.modifiedCount > 0;
  }

  async unpublishEventForm(id: number): Promise<boolean> {
    const database = await this.getDb();
    const result = await database.collection("event_forms").updateOne(
      { id },
      { $set: { isPublished: false } }
    );
    return result.modifiedCount > 0;
  }

  async deleteEventForm(id: number): Promise<boolean> {
    const database = await this.getDb();
    const result = await database.collection("event_forms").deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getScanHistory(limit?: number): Promise<ScanHistory[]> {
    const database = await this.getDb();
    const query = database.collection("scan_history")
      .find({})
      .sort({ scannedAt: -1 });
    
    if (limit) {
      query.limit(limit);
    }

    const history = await query.toArray();
    return history as unknown as ScanHistory[];
  }

  async getScanHistoryByTicketId(ticketId: string): Promise<ScanHistory[]> {
    const database = await this.getDb();
    const history = await database.collection("scan_history")
      .find({ ticketId })
      .sort({ scannedAt: -1 })
      .toArray();
    
    return history as unknown as ScanHistory[];
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

export const ticketDb = new TicketDatabase();

// Seed a default form on startup (optional)
export async function seedDefaultForm() {
  try {
    const existingForm = await ticketDb.getPublishedForm();
    if (!existingForm) {
      console.log("📝 No published form found. Seeding default form...");
      
      const defaultForm = await ticketDb.createEventForm({
        title: "Event Registration",
        subtitle: "Register for our upcoming event",
        description: "Please fill out the form below to register for the event.",
        baseFields: {
          name: {
            label: "Full Name",
            placeholder: "John Doe",
            required: true,
            enabled: true,
          },
          email: {
            label: "Email Address",
            placeholder: "john.doe@example.com",
            required: true,
            enabled: true,
          },
          phone: {
            label: "Phone Number",
            placeholder: "+1 (555) 123-4567",
            required: true,
            enabled: true,
          },
          organization: {
            label: "Organization",
            placeholder: "Acme Corporation",
            required: true,
            enabled: true,
          },
          groupSize: {
            label: "Group Size (Maximum 4 people)",
            placeholder: "",
            required: true,
            enabled: true,
          },
          teamMembers: {
            label: "Team Members",
            placeholder: "Select number of team members and fill in their details",
            required: true,
            enabled: true,
            maxTeamMembers: 4,
            memberNameLabel: "Full Name",
            memberNamePlaceholder: "Enter member name",
            memberEmailLabel: "Email",
            memberEmailPlaceholder: "Enter email address",
            memberPhoneLabel: "Phone",
            memberPhonePlaceholder: "Enter phone number",
          },
        },
      });

      await ticketDb.publishEventForm(defaultForm.id);
      console.log("✅ Default form created and published!");
    } else {
      console.log("✅ Published form already exists.");
    }
  } catch (error) {
    console.error("❌ Error seeding default form:", error);
  }
}

// Cleanup function to remove forms with invalid structure
export async function cleanupInvalidForms() {
  try {
    const db = await connectToDatabase();
    const forms = await db.collection("event_forms").find({}).toArray();
    
    let deletedCount = 0;
    for (const form of forms) {
      // Check if form has invalid structure (missing required fields)
      if (!form.id || typeof form.id !== 'number') {
        await db.collection("event_forms").deleteOne({ _id: form._id });
        deletedCount++;
        console.log(`🗑️  Deleted invalid form: ${form._id}`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} invalid form(s)`);
    }
  } catch (error) {
    console.error("❌ Error cleaning up invalid forms:", error);
  }
}
