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

  CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
  CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
  CREATE INDEX IF NOT EXISTS idx_scan_history_ticket ON scan_history(ticketId);
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

    if (registration.scans >= registration.maxScans) {
      return {
        valid: false,
        registration,
        message: "Maximum entries reached. QR code exhausted.",
      };
    }

    // Increment scan count
    const updateStmt = db.prepare(`
      UPDATE registrations
      SET scans = scans + 1,
          status = CASE 
            WHEN scans + 1 >= maxScans THEN 'exhausted'
            ELSE 'active'
          END
      WHERE id = ?
    `);

    updateStmt.run(ticketId);

    // Record scan in history
    this.addScanHistory(ticketId, true);

    // Get updated registration
    const updatedReg = this.getRegistration(ticketId)!;

    const remainingScans = updatedReg.maxScans - updatedReg.scans;
    return {
      valid: true,
      registration: updatedReg,
      message: remainingScans > 0
        ? `Entry granted. ${remainingScans} ${remainingScans === 1 ? 'entry' : 'entries'} remaining.`
        : "Entry granted. This was the last entry.",
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
}

export const ticketDb = new TicketDatabase();
