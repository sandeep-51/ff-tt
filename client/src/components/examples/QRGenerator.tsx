import QRGenerator from "../QRGenerator";
import type { Registration } from "../RegistrationsTable";

// TODO: Remove mock functionality
const mockPendingRegistrations: Registration[] = [
  {
    id: "REG004",
    name: "James Wilson",
    email: "james.w@enterprise.com",
    phone: "+1 555-0104",
    organization: "Enterprise Systems",
    groupSize: 3,
    scans: 0,
    maxScans: 4,
    hasQR: false,
    qrCodeData: null,
    status: "pending",
  },
  {
    id: "REG006",
    name: "David Martinez",
    email: "d.martinez@consulting.com",
    phone: "+1 555-0106",
    organization: "Martinez Consulting",
    groupSize: 1,
    scans: 0,
    maxScans: 4,
    hasQR: false,
    qrCodeData: null,
    status: "pending",
  },
  {
    id: "REG007",
    name: "Amanda Taylor",
    email: "a.taylor@design.studio",
    phone: "+1 555-0107",
    organization: "Taylor Design Studio",
    groupSize: 2,
    scans: 0,
    maxScans: 4,
    hasQR: false,
    qrCodeData: null,
    status: "pending",
  },
];

export default function QRGeneratorExample() {
  return (
    <QRGenerator
      registrations={mockPendingRegistrations}
      onGenerate={(id) => console.log("Generate QR for:", id)}
      siteUrl="https://yourdomain.com"
    />
  );
}
