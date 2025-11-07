import Database from "better-sqlite3";
import { nanoid } from "nanoid"; // Assuming nanoid is available and preferred over crypto.randomUUID
import type { Registration, InsertRegistration, ScanHistory } from "@shared/schema";

const db = new Database("tickets.db");

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

// Performance optimizations for handling large datasets
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = -64000"); // 64MB cache
db.pragma("temp_store = MEMORY");
db.pragma("mmap_size = 30000000000"); // 30GB memory-mapped I/O
db.pragma("page_size = 4096");
db.pragma("busy_timeout = 5000");

// Migration: Add formId column if it doesn't exist
try {
  db.exec(`ALTER TABLE registrations ADD COLUMN formId INTEGER`);
} catch (error: any) {
  // Column already exists, ignore error
  if (!error.message.includes("duplicate column name")) {
    console.error("Migration warning:", error.message);
  }
}

// Migration: Add customFieldData column to registrations if it doesn't exist
try {
  db.exec(`ALTER TABLE registrations ADD COLUMN customFieldData TEXT`);
} catch (error: any) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Migration warning:", error.message);
  }
}

// Migration: Add teamMembers column to registrations if it doesn't exist
try {
  db.exec(`ALTER TABLE registrations ADD COLUMN teamMembers TEXT DEFAULT '[]'`);
} catch (error: any) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Migration warning:", error.message);
  }
}

// Migration: Add customFields column to event_forms if it doesn't exist
try {
  db.exec(`ALTER TABLE event_forms ADD COLUMN customFields TEXT`);
} catch (error: any) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Migration warning:", error.message);
  }
}

// Migration: Add baseFields column to event_forms if it doesn't exist
try {
  db.exec(`ALTER TABLE event_forms ADD COLUMN baseFields TEXT`);
} catch (error: any) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Migration warning:", error.message);
  }
}

// Migration: Add successMessage column to event_forms if it doesn't exist
try {
  db.exec(`ALTER TABLE event_forms ADD COLUMN successMessage TEXT`);
} catch (error: any) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Migration warning:", error.message);
  }
}

// Migration: Add successTitle column to event_forms if it doesn't exist
try {
  db.exec(`ALTER TABLE event_forms ADD COLUMN successTitle TEXT`);
} catch (error: any) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Migration warning:", error.message);
  }
}

// Migration: Add backgroundImageUrl column to event_forms if it doesn't exist
try {
  db.exec(`ALTER TABLE event_forms ADD COLUMN backgroundImageUrl TEXT`);
} catch (error: any) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Migration warning:", error.message);
  }
}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    organization TEXT NOT NULL,
    groupSize INTEGER NOT NULL,
    scans INTEGER DEFAULT 0,
    maxScans INTEGER DEFAULT 4,
    hasQR INTEGER DEFAULT 0,
    qrCodeData TEXT,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    formId INTEGER,
    customFieldData TEXT,
    teamMembers TEXT DEFAULT '[]',
    FOREIGN KEY (formId) REFERENCES event_forms(id)
  );

  CREATE TABLE IF NOT EXISTS scan_history (
    id TEXT PRIMARY KEY,
    ticketId TEXT NOT NULL,
    scannedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    valid INTEGER NOT NULL,
    FOREIGN KEY (ticketId) REFERENCES registrations(id)
  );

  CREATE TABLE IF NOT EXISTS event_forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT,
    heroImageUrl TEXT,
    backgroundImageUrl TEXT,
    watermarkUrl TEXT,
    logoUrl TEXT,
    customLinks TEXT,
    description TEXT,
    customFields TEXT,
    baseFields TEXT,
    successMessage TEXT,
    successTitle TEXT,
    isPublished INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
  CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
  CREATE INDEX IF NOT EXISTS idx_registrations_formid ON registrations(formId); -- Added index for formId
  CREATE INDEX IF NOT EXISTS idx_scan_history_ticket ON scan_history(ticketId);
  CREATE INDEX IF NOT EXISTS idx_event_forms_published ON event_forms(isPublished);
`);

export class TicketDatabase {
  private db: Database.Database;

  constructor() {
    this.db = db; // Use the already initialized db instance
  }

  // Helper to generate a unique ticket ID
  private generateTicketId(): string {
    return `REG${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
  }

  // Registration methods
  createRegistration(data: InsertRegistration): Registration {
    const id = this.generateTicketId();
    const groupSize = data.groupSize || 1;
    const maxScans = groupSize * 4;

    const stmt = this.db.prepare(`
      INSERT INTO registrations (id, name, email, phone, organization, groupSize, maxScans, formId, customFieldData, teamMembers)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name || '',
      data.email || '',
      data.phone || '',
      data.organization || '',
      groupSize,
      maxScans,
      data.formId || null,
      data.customFieldData ? JSON.stringify(data.customFieldData) : null,
      data.teamMembers ? JSON.stringify(data.teamMembers) : JSON.stringify([])
    );

    const registration = this.getRegistration(id);
    if (!registration) {
      throw new Error("Failed to create registration");
    }

    return registration;
  }

  getRegistration(id: string): Registration | undefined {
    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        email,
        phone,
        organization,
        groupSize,
        scans,
        maxScans,
        hasQR,
        qrCodeData,
        status,
        createdAt,
        formId,
        customFieldData,
        teamMembers
      FROM registrations
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      groupSize: Number(row.groupSize),
      scans: Number(row.scans),
      maxScans: Number(row.maxScans),
      hasQR: Boolean(row.hasQR),
      customFieldData: row.customFieldData ? JSON.parse(row.customFieldData) : {},
      teamMembers: row.teamMembers ? JSON.parse(row.teamMembers) : [],
    };
  }

  getAllRegistrations(limit?: number, offset?: number): Registration[] {
    let query = `
      SELECT
        id,
        name,
        email,
        phone,
        organization,
        groupSize,
        scans,
        maxScans,
        hasQR,
        qrCodeData,
        status,
        createdAt,
        formId,
        customFieldData,
        teamMembers
      FROM registrations
      ORDER BY createdAt DESC
    `;
    
    if (limit !== undefined) {
      query += ` LIMIT ${limit}`;
      if (offset !== undefined) {
        query += ` OFFSET ${offset}`;
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      ...row,
      groupSize: Number(row.groupSize),
      scans: Number(row.scans),
      maxScans: Number(row.maxScans),
      hasQR: Boolean(row.hasQR),
      customFieldData: row.customFieldData ? JSON.parse(row.customFieldData) : {},
      teamMembers: row.teamMembers ? JSON.parse(row.teamMembers) : [],
    }));
  }

  getRegistrationsCount(): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM registrations");
    const result = stmt.get() as { count: number };
    return result.count;
  }

  getRegistrationsByFormId(formId: number, limit?: number, offset?: number): Registration[] {
    let query = `
      SELECT
        id,
        name,
        email,
        phone,
        organization,
        groupSize,
        scans,
        maxScans,
        hasQR,
        qrCodeData,
        status,
        createdAt,
        formId,
        customFieldData,
        teamMembers
      FROM registrations
      WHERE formId = ? ORDER BY createdAt DESC
    `;
    
    if (limit !== undefined) {
      query += ` LIMIT ${limit}`;
      if (offset !== undefined) {
        query += ` OFFSET ${offset}`;
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(formId) as any[];
    return rows.map((row) => ({
      ...row,
      groupSize: Number(row.groupSize),
      scans: Number(row.scans),
      maxScans: Number(row.maxScans),
      hasQR: Boolean(row.hasQR),
      customFieldData: row.customFieldData ? JSON.parse(row.customFieldData) : {},
      teamMembers: row.teamMembers ? JSON.parse(row.teamMembers) : [],
    }));
  }

  getRegistrationsByFormIdCount(formId: number): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM registrations WHERE formId = ?");
    const result = stmt.get(formId) as { count: number };
    return result.count;
  }

  generateQRCode(id: string, qrCodeData: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE registrations
      SET hasQR = 1, qrCodeData = ?, status = 'active'
      WHERE id = ? AND hasQR = 0
    `);

    const result = stmt.run(qrCodeData, id);
    return result.changes > 0;
  }

  verifyAndScan(ticketId: string): { valid: boolean; registration?: Registration; message: string } {
    const registration = this.getRegistration(ticketId);

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

    // Check if already scanned (scans > 0)
    if (registration.scans > 0) {
      return {
        valid: false,
        registration,
        message: "Already scanned. Entry already recorded.",
      };
    }

    // First scan - set status to 'checked-in'
    const updateStmt = this.db.prepare(`
      UPDATE registrations
      SET scans = 1,
          status = 'checked-in'
      WHERE id = ?
    `);

    updateStmt.run(ticketId);

    // Record scan in history
    this.addScanHistory(ticketId, true);

    // Get updated registration
    const updatedReg = this.getRegistration(ticketId)!;

    return {
      valid: true,
      registration: updatedReg,
      message: "Entry granted. Successfully checked in.",
    };
  }

  // Scan history methods
  addScanHistory(ticketId: string, valid: boolean): void {
    const id = nanoid(); // Use nanoid for scan history IDs
    const stmt = this.db.prepare(`
      INSERT INTO scan_history (id, ticketId, valid)
      VALUES (?, ?, ?)
    `);

    stmt.run(id, ticketId, valid ? 1 : 0);
  }

  getScanHistory(ticketId: string): ScanHistory[] {
    const stmt = this.db.prepare(`
      SELECT id, ticketId, scannedAt, valid
      FROM scan_history
      WHERE ticketId = ?
      ORDER BY scannedAt DESC
    `);

    const rows = stmt.all(ticketId) as any[];
    return rows.map((row) => ({
      ...row,
      valid: Boolean(row.valid),
    }));
  }

  getAllScanHistory(): ScanHistory[] {
    const stmt = this.db.prepare(`
      SELECT id, ticketId, scannedAt, valid
      FROM scan_history
      ORDER BY scannedAt DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      ...row,
      valid: Boolean(row.valid),
    }));
  }

  // Delete registration
  deleteRegistration(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM registrations WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Revoke QR code
  revokeQRCode(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE registrations
      SET hasQR = 0, qrCodeData = NULL, status = 'pending', scans = 0
      WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Statistics
  getStats() {
    const totalRegs = this.db.prepare("SELECT COUNT(*) as count FROM registrations").get() as { count: number };
    const qrGenerated = this.db.prepare("SELECT COUNT(*) as count FROM registrations WHERE hasQR = 1").get() as { count: number };
    const totalScans = this.db.prepare("SELECT SUM(scans) as total FROM registrations").get() as { total: number | null };
    const activeRegs = this.db.prepare("SELECT COUNT(*) as count FROM registrations WHERE status = 'checked-in'").get() as { count: number };

    return {
      totalRegistrations: totalRegs.count,
      qrCodesGenerated: qrGenerated.count,
      totalEntries: totalScans.total || 0,
      activeRegistrations: activeRegs.count,
    };
  }

  // Get form statistics (number of registrations for a given form)
  getFormStats(formId: number) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as totalRegistrations,
        SUM(CASE WHEN hasQR = 1 THEN 1 ELSE 0 END) as qrCodesGenerated,
        SUM(scans) as totalEntries,
        SUM(CASE WHEN status = 'checked-in' THEN 1 ELSE 0 END) as activeRegistrations
      FROM registrations
      WHERE formId = ?
    `);
    const result = stmt.get(formId) as any;
    return {
      totalRegistrations: result?.totalRegistrations || 0,
      qrCodesGenerated: result?.qrCodesGenerated || 0,
      totalEntries: result?.totalEntries || 0,
      activeRegistrations: result?.activeRegistrations || 0,
    };
  }

  // Event form methods
  createEventForm(data: {
    title: string;
    subtitle?: string;
    heroImageUrl?: string;
    backgroundImageUrl?: string;
    watermarkUrl?: string;
    logoUrl?: string;
    customLinks?: Array<{ label: string; url: string }>;
    description?: string;
    customFields?: any[];
    baseFields?: any;
    successMessage?: string;
    successTitle?: string;
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO event_forms (title, subtitle, heroImageUrl, backgroundImageUrl, watermarkUrl, logoUrl, customLinks, description, customFields, baseFields, successMessage, successTitle)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.title,
      data.subtitle || null,
      data.heroImageUrl || null,
      data.backgroundImageUrl || null,
      data.watermarkUrl || null,
      data.logoUrl || null,
      data.customLinks ? JSON.stringify(data.customLinks) : null,
      data.description || null,
      data.customFields ? JSON.stringify(data.customFields) : null,
      data.baseFields ? JSON.stringify(data.baseFields) : null,
      data.successMessage || null,
      data.successTitle || null
    );

    return this.getEventForm(Number(result.lastInsertRowid));
  }

  getEventForm(id: number) {
    const stmt = this.db.prepare(`
      SELECT id, title, subtitle, heroImageUrl, backgroundImageUrl, watermarkUrl, logoUrl, customLinks, description, customFields, baseFields, successMessage, successTitle, isPublished, createdAt, updatedAt
      FROM event_forms
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      ...row,
      isPublished: Boolean(row.isPublished),
      customLinks: row.customLinks ? JSON.parse(row.customLinks) : [],
      customFields: row.customFields ? JSON.parse(row.customFields) : [],
      baseFields: row.baseFields ? JSON.parse(row.baseFields) : undefined,
    };
  }

  getPublishedForm() {
    const stmt = this.db.prepare(`
      SELECT id, title, subtitle, heroImageUrl, backgroundImageUrl, watermarkUrl, logoUrl, customLinks, description, customFields, baseFields, successMessage, successTitle, isPublished, createdAt, updatedAt
      FROM event_forms
      WHERE isPublished = 1
      ORDER BY updatedAt DESC
      LIMIT 1
    `);

    const row = stmt.get() as any;
    if (!row) return null;

    return {
      ...row,
      isPublished: Boolean(row.isPublished),
      customLinks: row.customLinks ? JSON.parse(row.customLinks) : [],
      customFields: row.customFields ? JSON.parse(row.customFields) : [],
      baseFields: row.baseFields ? JSON.parse(row.baseFields) : undefined,
    };
  }

  getAllEventForms() {
    const stmt = this.db.prepare(`
      SELECT id, title, subtitle, heroImageUrl, backgroundImageUrl, watermarkUrl, logoUrl, customLinks, description, customFields, baseFields, successMessage, successTitle, isPublished, createdAt, updatedAt
      FROM event_forms
      ORDER BY updatedAt DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      ...row,
      isPublished: Boolean(row.isPublished),
      customLinks: row.customLinks ? JSON.parse(row.customLinks) : [],
      customFields: row.customFields ? JSON.parse(row.customFields) : [],
      baseFields: row.baseFields ? JSON.parse(row.baseFields) : undefined,
    }));
  }

  updateEventForm(id: number, data: {
    title?: string;
    subtitle?: string;
    heroImageUrl?: string;
    backgroundImageUrl?: string;
    watermarkUrl?: string;
    logoUrl?: string;
    customLinks?: Array<{ label: string; url: string }>;
    description?: string;
    customFields?: any[];
    baseFields?: any;
    successMessage?: string;
    successTitle?: string;
  }) {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      values.push(data.title);
    }
    if (data.subtitle !== undefined) {
      updates.push("subtitle = ?");
      values.push(data.subtitle || null);
    }
    if (data.heroImageUrl !== undefined) {
      updates.push("heroImageUrl = ?");
      values.push(data.heroImageUrl || null);
    }
    if (data.backgroundImageUrl !== undefined) {
      updates.push("backgroundImageUrl = ?");
      values.push(data.backgroundImageUrl || null);
    }
    if (data.watermarkUrl !== undefined) {
      updates.push("watermarkUrl = ?");
      values.push(data.watermarkUrl || null);
    }
    if (data.logoUrl !== undefined) {
      updates.push("logoUrl = ?");
      values.push(data.logoUrl || null);
    }
    if (data.customLinks !== undefined) {
      updates.push("customLinks = ?");
      values.push(JSON.stringify(data.customLinks));
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description || null);
    }
    if (data.customFields !== undefined) {
      updates.push("customFields = ?");
      values.push(JSON.stringify(data.customFields));
    }
    if (data.baseFields !== undefined) {
      updates.push("baseFields = ?");
      values.push(JSON.stringify(data.baseFields));
    }
    if (data.successMessage !== undefined) {
      updates.push("successMessage = ?");
      values.push(data.successMessage || null);
    }
    if (data.successTitle !== undefined) {
      updates.push("successTitle = ?");
      values.push(data.successTitle || null);
    }

    if (updates.length === 0) return false;

    updates.push("updatedAt = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE event_forms
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  publishEventForm(id: number) {
    // Unpublish all other forms first
    this.db.prepare("UPDATE event_forms SET isPublished = 0").run();

    // Publish this form
    const stmt = this.db.prepare("UPDATE event_forms SET isPublished = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  unpublishEventForm(id: number) {
    const stmt = this.db.prepare("UPDATE event_forms SET isPublished = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteEventForm(id: number) {
    const stmt = this.db.prepare("DELETE FROM event_forms WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

export const ticketDb = new TicketDatabase();