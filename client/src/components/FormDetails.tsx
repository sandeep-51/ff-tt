import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import RegistrationsTable, { type Registration } from "./RegistrationsTable";
import QRGenerator from "./QRGenerator";
import QRScanner from "./QRScanner";
import ExportData from "./ExportData";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface FormDetailsProps {
  formId: number;
  onBack: () => void;
}

export default function FormDetails({ formId, onBack }: FormDetailsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Fetch registrations for this specific form with pagination
  const { data: registrationsData, isLoading: loadingRegistrations, refetch: refetchRegistrations } = useQuery<{
    registrations: Registration[];
    total: number;
  }>({
    queryKey: [`/api/admin/forms/${formId}/registrations?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/forms/${formId}/registrations?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch registrations");
      return response.json();
    },
    enabled: !!formId,
  });

  const registrations = registrationsData?.registrations || [];
  const totalCount = registrationsData?.total || 0;

  // Fetch stats for this form
  const { data: stats, refetch: refetchStats } = useQuery<{
    totalRegistrations: number;
    qrCodesGenerated: number;
    totalEntries: number;
    activeRegistrations: number;
  }>({
    queryKey: [`/api/admin/forms/${formId}/stats`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/forms/${formId}/stats`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const handleGenerateQR = async (id: string) => {
    try {
      const response = await apiRequest("POST", `/api/admin/generate-qr/${id}`, {});
      const data = await response.json();

      toast({
        title: "QR Code Generated",
        description: `QR code created for registration ${id}`,
      });

      refetchRegistrations();
      refetchStats();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete registration");
      }

      toast({
        title: "Success",
        description: "Registration deleted successfully",
      });

      refetchRegistrations();
      refetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete registration",
        variant: "destructive",
      });
    }
  };

  const handleRevokeQR = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/revoke-qr/${id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke QR code");
      }

      toast({
        title: "Success",
        description: "QR code revoked successfully",
      });

      refetchRegistrations();
      refetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke QR code",
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
      refetchRegistrations();
      refetchStats();

      return {
        ticketId,
        name: data.registration?.name || "Unknown",
        organization: data.registration?.organization || "N/A",
        groupSize: data.registration?.groupSize || 1,
        scansUsed: data.registration?.scans || 0,
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
      const url = `/api/admin/forms/${formId}/export?format=${format}&filter=${filter}`;
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const extension = format === "pdf" ? "pdf" : format === "json" ? "json" : "csv";
      link.download = `form-${formId}-registrations-${Date.now()}.${extension}`;

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
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={onBack}
        data-testid="button-back-to-forms"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Forms
      </Button>

      <Tabs defaultValue="registrations">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="registrations" data-testid="tab-form-registrations">
            Registrations
          </TabsTrigger>
          <TabsTrigger value="generate" data-testid="tab-form-generate">
            Generate QR
          </TabsTrigger>
          <TabsTrigger value="scan" data-testid="tab-form-scan">
            Scan Entry
          </TabsTrigger>
          <TabsTrigger value="export" data-testid="tab-form-export">
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registrations">
          <RegistrationsTable
            registrations={registrations}
            onGenerateQR={handleGenerateQR}
            onDeleteRegistration={handleDeleteRegistration}
            onRevokeQR={handleRevokeQR}
          />
          {/* Pagination controls would go here, updating currentPage */}
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loadingRegistrations}
              variant="outline"
            >
              Previous
            </Button>
            <span className="mx-4 flex items-center">{currentPage} / {Math.ceil(totalCount / pageSize)}</span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
              disabled={currentPage === Math.ceil(totalCount / pageSize) || loadingRegistrations}
              variant="outline"
            >
              Next
            </Button>
          </div>
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
    </div>
  );
}