# Event Registration System

## Overview

This is a QR-based event registration and entry management system built with React, Express, and MongoDB. The system allows attendees to register for events through a public form, receive QR codes via email (sent through Brevo), and enables administrators to manage registrations, generate QR codes, scan entries, and track multi-entry access with a configurable maximum scan limit.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: shadcn/ui with Radix UI primitives
- Design system follows a dual personality approach:
  - Public-facing forms use Linear-inspired clean aesthetics with Stripe's trust-building elements
  - Admin dashboard uses Material Design principles for data-dense interfaces
- Component library located in `client/src/components/ui/`
- All components use Tailwind CSS for styling with a custom theme configuration

**Styling Approach**:
- Tailwind CSS with custom CSS variables for theming
- Typography: Inter font for UI, JetBrains Mono for monospace displays
- Spacing primitives restricted to Tailwind units: 2, 4, 6, 8, 12, 16
- Responsive layouts with max-width containers (max-w-2xl for public, max-w-7xl for admin)

**State Management**: 
- TanStack Query (React Query) for server state and data fetching
- Query client configured with custom fetch handlers and credentials: "include" for session management
- Local React state for UI interactions

**Routing**: Wouter for lightweight client-side routing

**Form Handling**: React Hook Form with Zod schema validation

### Backend Architecture

**Server Framework**: Express.js with TypeScript

**API Structure**: RESTful API with the following key endpoints:
- `/api/register` - Public registration submission
- `/api/admin/login` - Admin authentication
- `/api/admin/registrations` - CRUD operations for registrations
- `/api/admin/forms` - Event form builder and management
- `/api/admin/generate-qr` - QR code generation
- `/api/admin/verify` - QR code verification and scanning
- `/api/admin/export` - Data export (CSV/PDF)

**Session Management**: 
- Express-session for maintaining admin login state
- Session data includes `isAdmin` boolean flag
- Credentials passed with all requests via fetch configuration

### Data Storage

**Database**: MongoDB (cloud-hosted via MongoDB Atlas)
- Connection via MongoDB Node.js driver
- Database name: `event_registration` (configurable via DATABASE_NAME env var)
- Persistent cloud storage with automatic indexing

**Schema Design**:
- `registrations` collection: Stores attendee information, QR status, scan counts, and entry limits
  - Tracks: id, name, email, phone, organization, groupSize, scans, maxScans, hasQR, qrCodeData, status, formId
  - Indexed on: email, status, formId fields
- `scan_history` collection: Audit log of all QR code scans with ticket ID references
- `event_forms` collection: Customizable event form configurations with branding options
  - Indexed on: isPublished, id fields

**Data Validation**: 
- Shared Zod schemas between client and server (`shared/schema.ts`)
- Ensures type safety and consistent validation logic

### Authentication and Authorization

**Admin Authentication**:
- Password-based login (default: "K25KN@FreeFire2024", configurable via ADMIN_PASS env var)
- Session-based authentication using express-session
- Protected routes check `req.session.isAdmin` flag
- No user registration - single admin access model

**Security Considerations**:
- Session cookies with HTTP-only flag
- Password stored as environment variable
- CORS configured for same-origin by default

### QR Code System

**Generation**: 
- QRCode library generates PNG data URLs
- QR codes contain ticket IDs as payload
- Generated on-demand via admin dashboard
- Stored as base64 data URLs in database

**Verification Flow**:
1. QR code scanned containing ticket ID
2. Backend validates ticket exists and is active
3. Checks current scan count against maxScans limit (default: 4)
4. Increments scan counter if valid
5. Records scan event in scan_history table
6. Returns validation result with registration details

**Multi-Entry Tracking**:
- Each registration has configurable maxScans limit
- Status transitions: pending → active → exhausted
- Scanner displays remaining entries and group size

### External Dependencies

**Third-Party Libraries**:
- **QR Code Generation**: `qrcode` package for creating QR code images
- **PDF Generation**: `pdfkit` for exporting registration data and tickets as PDFs
- **File Upload**: `multer` for handling image uploads (hero images, logos, watermarks)
- **CSV Export**: `csv-stringify` for data export functionality
- **HTML5 QR Scanner**: `html5-qrcode` for camera-based QR code scanning in browser
- **Database**: `mongodb` driver for MongoDB cloud database

**External Services**:
- **Brevo (Sendinblue)**: Transactional email delivery service for sending QR codes to registered attendees (free tier: 300 emails/day)
- Google Fonts CDN for Inter and JetBrains Mono fonts
- No cloud storage - files stored locally in `attached_assets/uploads/`

**Development Tools**:
- Vite plugins for development experience (@replit/vite-plugin-runtime-error-modal, cartographer, dev-banner)
- TypeScript for type safety across client and server
- ESBuild for server-side bundling

**Environment Variables**:
- `MONGODB_URI` - MongoDB connection string (required)
- `DATABASE_NAME` - MongoDB database name (default: event_registration)
- `ADMIN_PASS` - Admin dashboard password (default: eventadmin@1111)
- `SITE_URL` - Base URL for QR code generation (default: http://localhost:5000)
- `SESSION_SECRET` - Session encryption secret (default: event-registration-secret)
- `NODE_ENV` - Environment mode (development/production)
- `BREVO_API_KEY` - Brevo (Sendinblue) API key for sending emails (required for email functionality)
- `EMAIL_FROM` - Sender email address for outgoing emails (default: noreply@event.com)
- `EMAIL_FROM_NAME` - Sender name for outgoing emails (default: Event Registration)

**Asset Management**:
- Uploaded files stored in `attached_assets/uploads/` directory
- Static assets served from `attached_assets/` via Vite alias
- File size limit: 5MB for image uploads
- Allowed formats: jpeg, jpg, png, gif, webp