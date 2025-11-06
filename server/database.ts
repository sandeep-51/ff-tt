import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import type { Registration, InsertRegistration, ScanHistory } from "@shared/schema";

const db = new Database("tickets.db");

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

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
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
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
    watermarkUrl TEXT,
    logoUrl TEXT,
    customLinks TEXT,
    description TEXT,
    isPublished INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
  CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
  CREATE INDEX IF NOT EXISTS idx_scan_history_ticket ON scan_history(ticketId);
  CREATE INDEX IF NOT EXISTS idx_event_forms_published ON event_forms(isPublished);
`);

export class TicketDatabase {
  // Registration methods
  createRegistration(data: InsertRegistration): Registration {
    const id = `REG${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
    const stmt = db.prepare(`
      INSERT INTO registrations (id, name, email, phone, organization, groupSize)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.name, data.email, data.phone, data.organization, data.groupSize);

    return this.getRegistration(id)!;
  }

  getRegistration(id: string): Registration | undefined {
    const stmt = db.prepare(`
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
        createdAt
      FROM registrations
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      hasQR: Boolean(row.hasQR),
    };
  }

  getAllRegistrations(): Registration[] {
    const stmt = db.prepare(`
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
        createdAt
      FROM registrations
      ORDER BY createdAt DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      ...row,
      hasQR: Boolean(row.hasQR),
    }));
  }

  generateQRCode(id: string, qrCodeData: string): boolean {
    const stmt = db.prepare(`
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
    const updateStmt = db.prepare(`
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
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO scan_history (id, ticketId, valid)
      VALUES (?, ?, ?)
    `);

    stmt.run(id, ticketId, valid ? 1 : 0);
  }

  getScanHistory(ticketId: string): ScanHistory[] {
    const stmt = db.prepare(`
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
    const stmt = db.prepare(`
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
    const stmt = db.prepare("DELETE FROM registrations WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Revoke QR code
  revokeQRCode(id: string): boolean {
    const stmt = db.prepare(`
      UPDATE registrations
      SET hasQR = 0, qrCodeData = NULL, status = 'pending', scans = 0
      WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Statistics
  getStats() {
    const totalRegs = db.prepare("SELECT COUNT(*) as count FROM registrations").get() as { count: number };
    const qrGenerated = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE hasQR = 1").get() as { count: number };
    const totalScans = db.prepare("SELECT SUM(scans) as total FROM registrations").get() as { total: number | null };
    const activeRegs = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE status = 'active'").get() as { count: number };

    return {
      totalRegistrations: totalRegs.count,
      qrCodesGenerated: qrGenerated.count,
      totalEntries: totalScans.total || 0,
      activeRegistrations: activeRegs.count,
    };
  }

  // Event form methods
  createEventForm(data: {
    title: string;
    subtitle?: string;
    heroImageUrl?: string;
    watermarkUrl?: string;
    logoUrl?: string;
    customLinks?: Array<{ label: string; url: string }>;
    description?: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO event_forms (title, subtitle, heroImageUrl, watermarkUrl, logoUrl, customLinks, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.title,
      data.subtitle || null,
      data.heroImageUrl || null,
      data.watermarkUrl || null,
      data.logoUrl || null,
      data.customLinks ? JSON.stringify(data.customLinks) : null,
      data.description || null
    );

    return this.getEventForm(Number(result.lastInsertRowid));
  }

  getEventForm(id: number) {
    const stmt = db.prepare(`
      SELECT id, title, subtitle, heroImageUrl, watermarkUrl, logoUrl, customLinks, description, isPublished, createdAt, updatedAt
      FROM event_forms
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      ...row,
      isPublished: Boolean(row.isPublished),
      customLinks: row.customLinks ? JSON.parse(row.customLinks) : [],
    };
  }

  getPublishedForm() {
    const stmt = db.prepare(`
      SELECT id, title, subtitle, heroImageUrl, watermarkUrl, logoUrl, customLinks, description, isPublished, createdAt, updatedAt
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
    };
  }

  getAllEventForms() {
    const stmt = db.prepare(`
      SELECT id, title, subtitle, heroImageUrl, watermarkUrl, logoUrl, customLinks, description, isPublished, createdAt, updatedAt
      FROM event_forms
      ORDER BY updatedAt DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      ...row,
      isPublished: Boolean(row.isPublished),
      customLinks: row.customLinks ? JSON.parse(row.customLinks) : [],
    }));
  }

  updateEventForm(id: number, data: {
    title?: string;
    subtitle?: string;
    heroImageUrl?: string;
    watermarkUrl?: string;
    logoUrl?: string;
    customLinks?: Array<{ label: string; url: string }>;
    description?: string;
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

    if (updates.length === 0) return false;

    updates.push("updatedAt = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = db.prepare(`
      UPDATE event_forms
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  publishEventForm(id: number) {
    // Unpublish all other forms first
    db.prepare("UPDATE event_forms SET isPublished = 0").run();

    // Publish this form
    const stmt = db.prepare("UPDATE event_forms SET isPublished = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  unpublishEventForm(id: number) {
    const stmt = db.prepare("UPDATE event_forms SET isPublished = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteEventForm(id: number) {
    const stmt = db.prepare("DELETE FROM event_forms WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

export const ticketDb = new TicketDatabase();
