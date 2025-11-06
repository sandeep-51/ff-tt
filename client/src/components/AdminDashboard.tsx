import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import RegistrationsTable, { type Registration } from "./RegistrationsTable";
import QRGenerator from "./QRGenerator";
import QRScanner from "./QRScanner";
import ExportData from "./ExportData";
import FormsList from "./FormsList";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("forms");

  // Fetch all registrations
  const { data: registrations = [], refetch } = useQuery<Registration[]>({
    queryKey: ["/api/admin/registrations"],
  });

  // Fetch stats
  const { data: stats } = useQuery<{
    totalRegistrations: number;
    qrCodesGenerated: number;
    totalEntries: number;
    activeRegistrations: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/logout", {});
      return response.json();
    },
    onSuccess: () => {
      onLogout();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleGenerateQR = async (id: string) => {
    try {
      const response = await apiRequest("POST", `/api/admin/generate-qr/${id}`, {});
      const data = await response.json();
      
      toast({
        title: "QR Code Generated",
        description: `QR code created for registration ${id}`,
      });

      // Invalidate and refetch registrations
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const handleVerifyScan = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/verify?t=${ticketId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Verification failed");
      }

      const data = await response.json();

      // Invalidate queries to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });

      return {
        ticketId,
        name: data.registration?.name || "Unknown",
        organization: data.registration?.organization || "N/A",
        groupSize: data.registration?.groupSize || 1,
        scansUsed: data.registration?.scansUsed || 0,
        maxScans: data.registration?.maxScans || 4,
        valid: data.valid,
        message: data.message,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        ticketId,
        name: "Unknown",
        organization: "N/A",
        groupSize: 1,
        scansUsed: 0,
        maxScans: 4,
        valid: false,
        message: "Invalid ticket or verification failed",
        timestamp: new Date(),
      };
    }
  };

  const handleExport = async (format: string, filter: string) => {
    try {
      const url = `/api/admin/export?format=${format}&filter=${filter}`;
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      
      const extension = format === "pdf" ? "pdf" : format === "json" ? "json" : "csv";
      link.download = `registrations-${Date.now()}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export Successful",
        description: `Data exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    }
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
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-3xl grid-cols-5 mb-8">
            <TabsTrigger value="forms" data-testid="tab-forms">
              Forms
            </TabsTrigger>
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

          <TabsContent value="forms">
            <FormsList />
          </TabsContent>

          <TabsContent value="registrations">
            <RegistrationsTable
              registrations={registrations}
              onGenerateQR={(id) => {
                handleGenerateQR(id);
                setActiveTab("generate");
              }}
            />
          </TabsContent>

          <TabsContent value="generate">
            <QRGenerator
              registrations={registrations}
              onGenerate={handleGenerateQR}
            />
          </TabsContent>

          <TabsContent value="scan">
            <QRScanner
              onScan={handleVerifyScan}
            />
          </TabsContent>

          <TabsContent value="export">
            <ExportData
              stats={stats || {
                totalRegistrations: 0,
                qrCodesGenerated: 0,
                totalEntries: 0,
                activeRegistrations: 0,
              }}
              onExport={handleExport}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
