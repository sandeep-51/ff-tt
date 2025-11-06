import RegistrationsTable, { type Registration } from "../RegistrationsTable";

// TODO: Remove mock functionality
const mockRegistrations: Registration[] = [
  {
    id: "REG001",
    name: "Sarah Johnson",
    email: "sarah.j@techcorp.com",
    phone: "+1 555-0101",
    organization: "TechCorp Inc",
    groupSize: 2,
    scans: 1,
    maxScans: 4,
    hasQR: true,
    qrCodeData: null,
    status: "active",
  },
  {
    id: "REG002",
    name: "Michael Chen",
    email: "m.chen@innovate.io",
    phone: "+1 555-0102",
    organization: "Innovate Solutions",
    groupSize: 1,
    scans: 0,
    maxScans: 4,
    hasQR: true,
    qrCodeData: null,
    status: "active",
  },
  {
    id: "REG003",
    name: "Emily Rodriguez",
    email: "emily.r@startup.co",
    phone: "+1 555-0103",
    organization: "StartupCo",
    groupSize: 4,
    scans: 4,
    maxScans: 4,
    hasQR: true,
    qrCodeData: null,
    status: "exhausted",
  },
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
    id: "REG005",
    name: "Lisa Anderson",
    email: "l.anderson@digital.net",
    phone: "+1 555-0105",
    organization: "Digital Networks",
    groupSize: 2,
    scans: 2,
    maxScans: 4,
    hasQR: true,
    qrCodeData: null,
    status: "active",
  },
];

export default function RegistrationsTableExample() {
  return (
    <RegistrationsTable
      registrations={mockRegistrations}
      onGenerateQR={(id) => console.log("Generate QR for:", id)}
    />
  );
}
