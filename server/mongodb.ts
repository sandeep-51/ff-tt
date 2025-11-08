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
    
    // Get the next ID by finding the max existing ID
    const maxIdDoc = await database.collection("event_forms")
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    
    const nextId = maxIdDoc.length > 0 && maxIdDoc[0].id ? maxIdDoc[0].id + 1 : 1;
    
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
      baseFields: data.baseFields || undefined,
      successMessage: data.successMessage || null,
      successTitle: data.successTitle || null,
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await database.collection("event_forms").insertOne(form);
    return await database.collection("event_forms").findOne({ _id: result.insertedId });
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
    console.log("📢 Publishing form with ID:", id);
    
    // Verify form exists first
    const formExists = await database.collection("event_forms").findOne({ id });
    if (!formExists) {
      console.error("❌ Form not found with ID:", id);
      throw new Error(`Form with ID ${id} not found`);
    }
    
    // First unpublish all forms
    await database.collection("event_forms").updateMany({}, { $set: { isPublished: false } });
    console.log("📢 Unpublished all other forms");
    
    // Then publish this specific form
    const result = await database.collection("event_forms").updateOne(
      { id },
      { $set: { isPublished: true, updatedAt: new Date().toISOString() } }
    );
    
    console.log("📢 Publish result:", { 
      matchedCount: result.matchedCount, 
      modifiedCount: result.modifiedCount 
    });
    
    if (result.matchedCount === 0) {
      throw new Error(`Form with ID ${id} not found`);
    }
    
    return result.modifiedCount > 0 || result.matchedCount > 0;
  }

  async unpublishEventForm(id: number) {
    const database = await this.getDb();
    console.log("📢 Unpublishing form with ID:", id);
    
    // Verify form exists first
    const formExists = await database.collection("event_forms").findOne({ id });
    if (!formExists) {
      console.error("❌ Form not found with ID:", id);
      throw new Error(`Form with ID ${id} not found`);
    }
    
    const result = await database.collection("event_forms").updateOne(
      { id },
      { $set: { isPublished: false, updatedAt: new Date().toISOString() } }
    );
    
    console.log("📢 Unpublish result:", { 
      matchedCount: result.matchedCount, 
      modifiedCount: result.modifiedCount 
    });
    
    if (result.matchedCount === 0) {
      throw new Error(`Form with ID ${id} not found`);
    }
    
    return result.modifiedCount > 0 || result.matchedCount > 0;
  }

  async deleteEventForm(id: number) {
    const database = await this.getDb();
    const result = await database.collection("event_forms").deleteOne({ id });
    return result.deletedCount > 0;
  }
}

export const ticketDb = new TicketDatabase();

// Seed a default tournament form with photo upload
export async function seedDefaultForm() {
  try {
    await connectToDatabase(); // Ensure DB is connected
    const formsCollection = db.collection('event_forms');

    // Check if any form exists
    const existingForm = await formsCollection.findOne({});
    if (existingForm) {
      console.log("📋 Form already exists, skipping seed");
      return;
    }

    // Create default tournament form
    const defaultForm = {
      id: 1,
      title: "University of Allahabad - Free Fire Tournament",
      subtitle: "Register now to receive your secure QR-based entry pass",
      description: "Join the ultimate Free Fire tournament! ₹99 registration fee per slot.",
      heroImageUrl: null,
      backgroundImageUrl: null,
      watermarkUrl: null,
      logoUrl: null,
      customLinks: [
        {
          label: "UPI ID: tournament@upi",
          url: "upi://pay?pa=tournament@upi"
        }
      ],
      customFields: [
        {
          id: "field_ingame_uid",
          type: "text",
          label: "In-Game UID",
          placeholder: "Free Fire UID",
          required: true,
          helpText: "Enter your Free Fire unique ID"
        },
        {
          id: "field_transaction_id",
          type: "text",
          label: "Transaction ID / UTR",
          placeholder: "e.g., 3245xxxxxxxx",
          required: true,
          helpText: "Enter your payment transaction ID"
        },
        {
          id: "field_payment_screenshot",
          type: "photo",
          label: "Payment Screenshot",
          placeholder: "",
          required: true,
          helpText: "Upload clear image of success screen"
        }
      ],
      baseFields: {
        name: {
          label: "Full Name",
          placeholder: "Enter your name",
          required: true,
          enabled: true,
          helpText: "Squad Leader's full name"
        },
        email: {
          label: "Email Address",
          placeholder: "valid@email.com",
          required: true,
          enabled: true,
          helpText: ""
        },
        phone: {
          label: "Phone Number",
          placeholder: "10-digit mobile number",
          required: true,
          enabled: true,
          helpText: ""
        },
        organization: {
          label: "Organization",
          placeholder: "University/College name",
          required: false,
          enabled: true,
          helpText: ""
        },
        groupSize: {
          label: "Group Size (Maximum 4 people)",
          placeholder: "",
          required: false,
          enabled: false,
          helpText: ""
        },
        teamMembers: {
          label: "Team Members",
          placeholder: "Select number of team members (Solo, Duo, Trio, or Full Squad)",
          required: true,
          enabled: true,
          maxTeamMembers: 4,
          memberNameLabel: "Full Name",
          memberNamePlaceholder: "Enter member name",
          memberEmailLabel: "Email",
          memberEmailPlaceholder: "member@example.com",
          memberPhoneLabel: "Phone Number",
          memberPhonePlaceholder: "+1 (555) 123-4567",
          registrationFee: 99,
          registrationFeeDescription: "You are buying ONE slot. The fee is fixed at ₹99 whether you play Solo, Duo, Trio, or Full Squad."
        }
      },
      successTitle: "Registration Successful!",
      successMessage: "Thank you for registering! Your entry has been recorded. You will receive your QR code shortly.",
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await formsCollection.insertOne(defaultForm);
    console.log("✅ Default tournament form created with ID:", result.insertedId);

    return result.insertedId;
  } catch (error) {
    console.error("❌ Error seeding default form:", error);
    throw error;
  }
}