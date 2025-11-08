
import { MongoClient, Db, ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import type { Registration, InsertRegistration, ScanHistory } from "@shared/schema";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://sandeepnath801051_db_user:AzcldlJxLtyzOr6O@cluster0.vm6uex5.mongodb.net/?appName=Cluster0";
const DATABASE_NAME = process.env.DATABASE_NAME || "event_registration";

let client: MongoClient;
let db: Db;

async function connectToDatabase() {
  if (!client) {
    try {
      console.log("🔄 Connecting to MongoDB...");
      console.log("📍 URI:", MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password in logs
      console.log("📦 Database:", DATABASE_NAME);
      
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DATABASE_NAME);
      
      // Create indexes
      await db.collection("registrations").createIndex({ email: 1 });
      await db.collection("registrations").createIndex({ status: 1 });
      await db.collection("registrations").createIndex({ formId: 1 });
      await db.collection("scan_history").createIndex({ ticketId: 1 });
      await db.collection("event_forms").createIndex({ isPublished: 1 });
      
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
      formId: data.formId || null,
      customFieldData: data.customFieldData || {},
      teamMembers: data.teamMembers || [],
    };

    await database.collection("registrations").insertOne(registration);
    return registration as Registration;
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const database = await this.getDb();
    const registration = await database.collection("registrations").findOne({ id });
    return registration as Registration | undefined;
  }

  async getAllRegistrations(limit?: number, offset?: number): Promise<Registration[]> {
    const database = await this.getDb();
    let query = database.collection("registrations").find({}).sort({ createdAt: -1 });
    
    if (offset !== undefined) {
      query = query.skip(offset);
    }
    if (limit !== undefined) {
      query = query.limit(limit);
    }

    return await query.toArray() as Registration[];
  }

  async getRegistrationsCount(): Promise<number> {
    const database = await this.getDb();
    return await database.collection("registrations").countDocuments();
  }

  async getRegistrationsByFormId(formId: number, limit?: number, offset?: number): Promise<Registration[]> {
    const database = await this.getDb();
    let query = database.collection("registrations").find({ formId }).sort({ createdAt: -1 });
    
    if (offset !== undefined) {
      query = query.skip(offset);
    }
    if (limit !== undefined) {
      query = query.limit(limit);
    }

    return await query.toArray() as Registration[];
  }

  async getRegistrationsByFormIdCount(formId: number): Promise<number> {
    const database = await this.getDb();
    return await database.collection("registrations").countDocuments({ formId });
  }

  async generateQRCode(id: string, qrCodeData: string): Promise<boolean> {
    const database = await this.getDb();
    const result = await database.collection("registrations").updateOne(
      { id, hasQR: false },
      { $set: { hasQR: true, qrCodeData, status: 'active' } }
    );
    return result.modifiedCount > 0;
  }

  async verifyAndScan(ticketId: string): Promise<{ valid: boolean; registration?: Registration; message: string }> {
    const database = await this.getDb();
    const registration = await this.getRegistration(ticketId);

    if (!registration) {
      return {
        valid: false,
        message: "Invalid ticket ID. Registration not found.",
      };
    }

    if (!registration.hasQR) {
      return {
        valid: false,
        registration,
        message: "QR code not generated for this registration.",
      };
    }

    if (registration.scans > 0) {
      await this.addScanHistory(ticketId, false);
      return {
        valid: false,
        registration,
        message: "Already scanned. Entry already recorded.",
      };
    }

    await database.collection("registrations").updateOne(
      { id: ticketId },
      { $set: { scans: 1, status: 'checked-in' } }
    );

    await this.addScanHistory(ticketId, true);

    const updatedReg = await this.getRegistration(ticketId);

    return {
      valid: true,
      registration: updatedReg!,
      message: "Entry granted. Successfully checked in.",
    };
  }

  async addScanHistory(ticketId: string, valid: boolean): Promise<void> {
    const database = await this.getDb();
    const id = nanoid();
    await database.collection("scan_history").insertOne({
      id,
      ticketId,
      scannedAt: new Date().toISOString(),
      valid,
    });
  }

  async getScanHistory(ticketId: string): Promise<ScanHistory[]> {
    const database = await this.getDb();
    return await database.collection("scan_history")
      .find({ ticketId })
      .sort({ scannedAt: -1 })
      .toArray() as ScanHistory[];
  }

  async getAllScanHistory(): Promise<ScanHistory[]> {
    const database = await this.getDb();
    return await database.collection("scan_history")
      .find({})
      .sort({ scannedAt: -1 })
      .toArray() as ScanHistory[];
  }

  async deleteRegistration(id: string): Promise<boolean> {
    const database = await this.getDb();
    await database.collection("scan_history").deleteMany({ ticketId: id });
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
    const registration = await this.getRegistration(id);
    if (!registration) return false;

    const updates: any = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.organization !== undefined) updates.organization = data.organization;
    if (data.groupSize !== undefined) {
      updates.groupSize = data.groupSize;
      updates.maxScans = data.groupSize * 1;
    }
    if (data.customFieldData !== undefined) updates.customFieldData = data.customFieldData;
    if (data.teamMembers !== undefined) updates.teamMembers = data.teamMembers;

    if (Object.keys(updates).length === 0) return false;

    const result = await database.collection("registrations").updateOne(
      { id },
      { $set: updates }
    );
    return result.modifiedCount > 0;
  }

  async getStats() {
    const database = await this.getDb();
    const totalRegistrations = await database.collection("registrations").countDocuments();
    const qrCodesGenerated = await database.collection("registrations").countDocuments({ hasQR: true });
    const totalEntriesResult = await database.collection("registrations").aggregate([
      { $group: { _id: null, total: { $sum: "$scans" } } }
    ]).toArray();
    const totalEntries = totalEntriesResult[0]?.total || 0;
    const activeRegistrations = await database.collection("registrations").countDocuments({ status: 'checked-in' });

    return {
      totalRegistrations,
      qrCodesGenerated,
      totalEntries,
      activeRegistrations,
    };
  }

  async getFormStats(formId: number) {
    const database = await this.getDb();
    const result = await database.collection("registrations").aggregate([
      { $match: { formId } },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          qrCodesGenerated: { $sum: { $cond: ["$hasQR", 1, 0] } },
          totalEntries: { $sum: "$scans" },
          activeRegistrations: { $sum: { $cond: [{ $eq: ["$status", "checked-in"] }, 1, 0] } }
        }
      }
    ]).toArray();

    return result[0] || {
      totalRegistrations: 0,
      qrCodesGenerated: 0,
      totalEntries: 0,
      activeRegistrations: 0,
    };
  }

  async createEventForm(data: any) {
    const database = await this.getDb();
    const form = {
      title: data.title,
      subtitle: data.subtitle || null,
      heroImageUrl: data.heroImageUrl || null,
      backgroundImageUrl: data.backgroundImageUrl || null,
      watermarkUrl: data.watermarkUrl || null,
      logoUrl: data.logoUrl || null,
      customLinks: data.customLinks || [],
      description: data.description || null,
      customFields: data.customFields || [],
      baseFields: data.baseFields || undefined,
      successMessage: data.successMessage || null,
      successTitle: data.successTitle || null,
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await database.collection("event_forms").insertOne(form);
    const insertedId = result.insertedId;
    
    // Assign auto-incrementing id
    const count = await database.collection("event_forms").countDocuments();
    await database.collection("event_forms").updateOne(
      { _id: insertedId },
      { $set: { id: count } }
    );

    return await database.collection("event_forms").findOne({ _id: insertedId });
  }

  async getEventForm(id: number) {
    const database = await this.getDb();
    return await database.collection("event_forms").findOne({ id });
  }

  async getPublishedForm() {
    const database = await this.getDb();
    return await database.collection("event_forms")
      .find({ isPublished: true })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray()
      .then(forms => forms[0] || null);
  }

  async getAllEventForms() {
    const database = await this.getDb();
    return await database.collection("event_forms")
      .find({})
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async updateEventForm(id: number, data: any) {
    const database = await this.getDb();
    const updates: any = {};

    if (data.title !== undefined) updates.title = data.title;
    if (data.subtitle !== undefined) updates.subtitle = data.subtitle || null;
    if (data.heroImageUrl !== undefined) updates.heroImageUrl = data.heroImageUrl || null;
    if (data.backgroundImageUrl !== undefined) updates.backgroundImageUrl = data.backgroundImageUrl || null;
    if (data.watermarkUrl !== undefined) updates.watermarkUrl = data.watermarkUrl || null;
    if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl || null;
    if (data.customLinks !== undefined) updates.customLinks = data.customLinks;
    if (data.description !== undefined) updates.description = data.description || null;
    if (data.customFields !== undefined) updates.customFields = data.customFields;
    if (data.baseFields !== undefined) updates.baseFields = data.baseFields;
    if (data.successMessage !== undefined) updates.successMessage = data.successMessage || null;
    if (data.successTitle !== undefined) updates.successTitle = data.successTitle || null;

    if (Object.keys(updates).length === 0) return false;

    updates.updatedAt = new Date().toISOString();

    const result = await database.collection("event_forms").updateOne(
      { id },
      { $set: updates }
    );
    return result.modifiedCount > 0;
  }

  async publishEventForm(id: number) {
    const database = await this.getDb();
    await database.collection("event_forms").updateMany({}, { $set: { isPublished: false } });
    const result = await database.collection("event_forms").updateOne(
      { id },
      { $set: { isPublished: true, updatedAt: new Date().toISOString() } }
    );
    return result.modifiedCount > 0;
  }

  async unpublishEventForm(id: number) {
    const database = await this.getDb();
    const result = await database.collection("event_forms").updateOne(
      { id },
      { $set: { isPublished: false, updatedAt: new Date().toISOString() } }
    );
    return result.modifiedCount > 0;
  }

  async deleteEventForm(id: number) {
    const database = await this.getDb();
    const result = await database.collection("event_forms").deleteOne({ id });
    return result.deletedCount > 0;
  }
}

export const ticketDb = new TicketDatabase();
