import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import QRCode from "qrcode";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertRegistrationSchema, adminLoginSchema, eventFormSchema } from "@shared/schema";
import { stringify } from "csv-stringify/sync";
import PDFDocument from "pdfkit";

const ADMIN_PASSWORD = process.env.ADMIN_PASS || "K25KN@FreeFire2024";
const SITE_URL = process.env.SITE_URL || "http://localhost:5000";

// Extend session data
declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
  }
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "attached_assets", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use("/attached_assets/uploads", express.static(uploadDir));

  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "event-registration-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Middleware to check admin authentication
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Public Routes
  
  // POST /api/register - Create new registration
  app.post("/api/register", express.json(), async (req, res) => {
    try {
      const validated = insertRegistrationSchema.parse(req.body);
      const registration = await storage.createRegistration(validated);
      res.json(registration);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid registration data" });
    }
  });

  // GET /api/verify - Verify QR code and record scan
  app.get("/api/verify", async (req, res) => {
    try {
      const ticketId = req.query.t as string;

      if (!ticketId) {
        return res.status(400).json({ error: "Ticket ID is required" });
      }

      const result = await storage.verifyAndScan(ticketId);

      res.json({
        valid: result.valid,
        message: result.message,
        registration: result.registration ? {
          id: result.registration.id,
          name: result.registration.name,
          organization: result.registration.organization,
          groupSize: result.registration.groupSize,
          scansUsed: result.registration.scans,
          maxScans: result.registration.maxScans,
        } : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });

  // GET /api/published-form - Get published form (public)
  app.get("/api/published-form", async (req, res) => {
    try {
      const form = await storage.getPublishedForm();
      res.json(form);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch published form" });
    }
  });

  // Admin Routes

  // POST /api/admin/login - Admin login
  app.post("/api/admin/login", express.json(), async (req, res) => {
    try {
      const { password } = adminLoginSchema.parse(req.body);

      if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  // POST /api/admin/logout - Admin logout
  app.post("/api/admin/logout", requireAdmin, async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // GET /api/admin/check - Check if admin is logged in
  app.get("/api/admin/check", async (req, res) => {
    res.json({ isAdmin: req.session.isAdmin || false });
  });

  // GET /api/admin/registrations - Get all registrations
  app.get("/api/admin/registrations", requireAdmin, async (req, res) => {
    try {
      const registrations = await storage.getAllRegistrations();
      res.json(registrations);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch registrations" });
    }
  });

  // POST /api/admin/generate-qr/:id - Generate QR code for a registration
  app.post("/api/admin/generate-qr/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const registration = await storage.getRegistration(id);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      if (registration.hasQR) {
        return res.status(400).json({ error: "QR code already generated for this registration" });
      }

      // Generate verification URL
      const verificationUrl = `${SITE_URL}/verify?t=${id}`;

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      // Save QR code data to database
      await storage.generateQRCode(id, qrCodeDataUrl);

      // Get updated registration
      const updatedReg = await storage.getRegistration(id);

      res.json({
        success: true,
        registration: updatedReg,
        qrCodeDataUrl,
        verificationUrl,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to generate QR code" });
    }
  });

  // GET /api/admin/stats - Get statistics
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch stats" });
    }
  });

  // GET /api/admin/export - Export data
  app.get("/api/admin/export", requireAdmin, async (req, res) => {
    try {
      const format = req.query.format as string || "csv";
      const filter = req.query.filter as string || "all";

      let registrations = await storage.getAllRegistrations();

      // Apply filters
      switch (filter) {
        case "active":
          registrations = registrations.filter((r) => r.status === "active");
          break;
        case "exhausted":
          registrations = registrations.filter((r) => r.status === "exhausted");
          break;
        case "pending":
          registrations = registrations.filter((r) => r.status === "pending");
          break;
        case "today":
          const today = new Date().toISOString().split("T")[0];
          registrations = registrations.filter((r) => r.createdAt.startsWith(today));
          break;
      }

      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="registrations-${Date.now()}.json"`);
        res.json(registrations);
      } else if (format === "csv") {
        const csvData = stringify(
          registrations.map((r) => ({
            ID: r.id,
            Name: r.name,
            Email: r.email,
            Phone: r.phone,
            Organization: r.organization,
            "Group Size": r.groupSize,
            "Scans Used": r.scans,
            "Max Scans": r.maxScans,
            "Has QR": r.hasQR ? "Yes" : "No",
            Status: r.status,
            "Created At": r.createdAt,
          })),
          { header: true }
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="registrations-${Date.now()}.csv"`);
        res.send(csvData);
      } else if (format === "pdf") {
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="registrations-${Date.now()}.pdf"`);

        doc.pipe(res);

        // Title
        doc.fontSize(20).text("Event Registration Report", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
        doc.moveDown(2);

        // Summary
        const stats = await storage.getStats();
        doc.fontSize(14).text("Summary", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Total Registrations: ${stats.totalRegistrations}`);
        doc.text(`QR Codes Generated: ${stats.qrCodesGenerated}`);
        doc.text(`Total Entries: ${stats.totalEntries}`);
        doc.text(`Active Registrations: ${stats.activeRegistrations}`);
        doc.moveDown(2);

        // Registrations list
        doc.fontSize(14).text("Registrations", { underline: true });
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
        });

        doc.end();
      } else {
        res.status(400).json({ error: "Invalid export format" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Export failed" });
    }
  });

  // POST /api/admin/forms - Create new event form
  app.post("/api/admin/forms", requireAdmin, express.json(), async (req, res) => {
    try {
      const validated = eventFormSchema.parse(req.body);
      const form = await storage.createEventForm(validated);
      res.json({ success: true, form });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid form data" });
    }
  });

  // GET /api/admin/forms - Get all event forms
  app.get("/api/admin/forms", requireAdmin, async (req, res) => {
    try {
      const forms = await storage.getAllEventForms();
      res.json(forms);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch forms" });
    }
  });

  // GET /api/admin/forms/:id - Get specific event form
  app.get("/api/admin/forms/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const form = await storage.getEventForm(id);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      res.json(form);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch form" });
    }
  });

  // PUT /api/admin/forms/:id - Update event form
  app.put("/api/admin/forms/:id", requireAdmin, express.json(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = eventFormSchema.parse(req.body);
      const success = await storage.updateEventForm(id, validated);
      
      if (success) {
        const updated = await storage.getEventForm(id);
        res.json({ success: true, form: updated });
      } else {
        res.status(500).json({ error: "Failed to update form" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid form data" });
    }
  });

  // POST /api/admin/forms/:id/publish - Publish event form
  app.post("/api/admin/forms/:id/publish", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.publishEventForm(id);
      
      if (success) {
        const form = await storage.getEventForm(id);
        res.json({ success: true, form });
      } else {
        res.status(500).json({ error: "Failed to publish form" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Publish failed" });
    }
  });

  // POST /api/admin/forms/:id/unpublish - Unpublish event form
  app.post("/api/admin/forms/:id/unpublish", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.unpublishEventForm(id);
      
      if (success) {
        const form = await storage.getEventForm(id);
        res.json({ success: true, form });
      } else {
        res.status(500).json({ error: "Failed to unpublish form" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Unpublish failed" });
    }
  });

  // DELETE /api/admin/forms/:id - Delete event form
  app.delete("/api/admin/forms/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEventForm(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete form" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Delete failed" });
    }
  });

  // POST /api/admin/upload-image - Upload image for form
  app.post("/api/admin/upload-image", requireAdmin, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageUrl = `/attached_assets/uploads/${req.file.filename}`;
      res.json({ success: true, imageUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Image upload failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
