import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  Users,
  QrCode,
  Activity,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportStats {
  totalRegistrations: number;
  qrCodesGenerated: number;
  totalEntries: number;
  activeRegistrations: number;
}

interface ExportDataProps {
  stats?: ExportStats;
  onExport?: (format: string, filter: string) => void;
}

export default function ExportData({
  stats = {
    totalRegistrations: 0,
    qrCodesGenerated: 0,
    totalEntries: 0,
    activeRegistrations: 0,
  },
  onExport,
}: ExportDataProps) {
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const handleExport = () => {
    console.log(`Exporting as ${selectedFormat} with filter ${selectedFilter}`);
    onExport?.(selectedFormat, selectedFilter);
    toast({
      title: "Export Started",
      description: `Generating ${selectedFormat.toUpperCase()} file...`,
    });
  };

  const exportFormats = [
    {
      id: "csv",
      name: "CSV",
      description: "Comma-separated values",
      icon: FileSpreadsheet,
    },
    {
      id: "json",
      name: "JSON",
      description: "JavaScript Object Notation",
      icon: FileJson,
    },
    {
      id: "pdf",
      name: "PDF Report",
      description: "Formatted PDF document",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Registrations</p>
                <p className="text-3xl font-bold" data-testid="text-total-registrations">
                  {stats.totalRegistrations}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">QR Codes Generated</p>
                <p className="text-3xl font-bold" data-testid="text-qr-generated">
                  {stats.qrCodesGenerated}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Entries Logged</p>
                <p className="text-3xl font-bold" data-testid="text-total-entries">
                  {stats.totalEntries}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Registrations</p>
                <p className="text-3xl font-bold" data-testid="text-active-registrations">
                  {stats.activeRegistrations}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Attendance Data</CardTitle>
          <CardDescription>
            Download registration and attendance data in your preferred format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="filter-select">Data Filter</Label>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger id="filter-select" data-testid="select-filter">
                  <SelectValue placeholder="Select data to export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Registrations</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="exhausted">Exhausted QR Codes</SelectItem>
                  <SelectItem value="pending">Pending QR Generation</SelectItem>
                  <SelectItem value="today">Today's Entries</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format-select">Export Format</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger id="format-select" data-testid="select-format">
                  <SelectValue placeholder="Select export format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                  <SelectItem value="json">JSON (Developer Friendly)</SelectItem>
                  <SelectItem value="pdf">PDF Report (Printable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exportFormats.map((format) => {
              const Icon = format.icon;
              const isSelected = selectedFormat === format.id;

              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left hover-elevate ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  data-testid={`button-format-${format.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{format.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            size="lg"
            onClick={handleExport}
            className="w-full"
            data-testid="button-export"
          >
            <Download className="h-5 w-5 mr-2" />
            Export {selectedFormat.toUpperCase()} File
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
