import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import FormsList from "./FormsList";
import FormDetails from "./FormDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QRScanner from "./QRScanner";
import QRGenerator from "./QRGenerator";
import ExportData from "./ExportData";
import ScanHistory from "./ScanHistory";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const { toast } = useToast();
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-filter supports-[backdrop-filter]:bg-background/60">
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
        <div className="space-y-6">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={(value) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="forms">Forms</TabsTrigger>
              <TabsTrigger value="scanner">Scanner</TabsTrigger>
              <TabsTrigger value="generator">Generator</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Overview content will go here */}
              <p>Overview Dashboard</p>
            </TabsContent>

            <TabsContent value="forms" className="space-y-6">
              {selectedFormId === null ? (
                <FormsList onFormClick={(formId) => setSelectedFormId(formId)} />
              ) : (
                <FormDetails
                  formId={selectedFormId}
                  onBack={() => setSelectedFormId(null)}
                />
              )}
            </TabsContent>

            <TabsContent value="scanner" className="space-y-6">
              <QRScanner />
            </TabsContent>

            <TabsContent value="generator" className="space-y-6">
              <QRGenerator />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <ScanHistory />
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <ExportData />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}