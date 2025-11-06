import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Shield } from "lucide-react";
import RegistrationsTable, { type Registration } from "./RegistrationsTable";
import QRGenerator from "./QRGenerator";
import QRScanner from "./QRScanner";
import ExportData from "./ExportData";

interface AdminDashboardProps {
  onLogout?: () => void;
  registrations?: Registration[];
}

export default function AdminDashboard({
  onLogout,
  registrations = [],
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("registrations");

  const stats = {
    totalRegistrations: registrations.length,
    qrCodesGenerated: registrations.filter((r) => r.hasQR).length,
    totalEntries: registrations.reduce((sum, r) => sum + r.scans, 0),
    activeRegistrations: registrations.filter((r) => r.status === "active").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Event Registration System</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              console.log("Logging out");
              onLogout?.();
            }}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8">
            <TabsTrigger value="registrations" data-testid="tab-registrations">
              Registrations
            </TabsTrigger>
            <TabsTrigger value="generate" data-testid="tab-generate">
              Generate QR
            </TabsTrigger>
            <TabsTrigger value="scan" data-testid="tab-scan">
              Scan Entry
            </TabsTrigger>
            <TabsTrigger value="export" data-testid="tab-export">
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <RegistrationsTable
              registrations={registrations}
              onGenerateQR={(id) => {
                console.log("Generate QR for:", id);
                setActiveTab("generate");
              }}
            />
          </TabsContent>

          <TabsContent value="generate">
            <QRGenerator
              registrations={registrations}
              onGenerate={(id) => console.log("Generated QR for:", id)}
            />
          </TabsContent>

          <TabsContent value="scan">
            <QRScanner
              onScan={(ticketId) => {
                console.log("Scanned:", ticketId);
                // Return null to use default mock behavior
                return null;
              }}
            />
          </TabsContent>

          <TabsContent value="export">
            <ExportData
              stats={stats}
              onExport={(format, filter) =>
                console.log(`Export ${filter} as ${format}`)
              }
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
