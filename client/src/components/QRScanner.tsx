import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Scan,
} from "lucide-react";

interface ScanResult {
  ticketId: string;
  name: string;
  organization: string;
  groupSize: number;
  scansUsed: number;
  maxScans: number;
  valid: boolean;
  message: string;
  timestamp: Date;
}

interface QRScannerProps {
  onScan?: (ticketId: string) => ScanResult | null;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);

  const handleStartScanning = () => {
    setIsScanning(true);
    console.log("Camera scanning started");
    
    // TODO: Remove mock functionality - Simulate scan after 2 seconds
    setTimeout(() => {
      handleMockScan();
    }, 2000);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    console.log("Camera scanning stopped");
  };

  const handleMockScan = () => {
    // TODO: Remove mock functionality
    const mockTicketId = `REG${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`;
    const mockResults: ScanResult[] = [
      {
        ticketId: mockTicketId,
        name: "Sarah Johnson",
        organization: "TechCorp Inc",
        groupSize: 2,
        scansUsed: 1,
        maxScans: 4,
        valid: true,
        message: "Entry granted. 3 entries remaining.",
        timestamp: new Date(),
      },
      {
        ticketId: mockTicketId,
        name: "Invalid User",
        organization: "N/A",
        groupSize: 1,
        scansUsed: 4,
        maxScans: 4,
        valid: false,
        message: "Maximum entries reached. QR code exhausted.",
        timestamp: new Date(),
      },
      {
        ticketId: mockTicketId,
        name: "Michael Chen",
        organization: "Innovate Solutions",
        groupSize: 1,
        scansUsed: 0,
        maxScans: 4,
        valid: true,
        message: "First entry. 4 entries available.",
        timestamp: new Date(),
      },
    ];

    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    
    if (onScan) {
      const customResult = onScan(result.ticketId);
      if (customResult) {
        setLastResult(customResult);
        setScanHistory((prev) => [customResult, ...prev].slice(0, 10));
      }
    } else {
      setLastResult(result);
      setScanHistory((prev) => [result, ...prev].slice(0, 10));
    }
    
    setIsScanning(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Scanner</CardTitle>
              <CardDescription>
                Scan attendee QR codes to verify entry and track attendance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="aspect-square max-w-2xl mx-auto rounded-lg overflow-hidden bg-muted border-2 border-border relative">
                {isScanning ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="relative">
                      <div className="h-64 w-64 border-4 border-primary rounded-lg animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Scan className="h-16 w-16 text-primary animate-pulse" />
                      </div>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <p className="text-white text-sm font-medium">Scanning for QR code...</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-8">
                    <Camera className="h-16 w-16 text-muted-foreground" />
                    <div className="text-center space-y-2">
                      <p className="font-medium">Camera Preview</p>
                      <p className="text-sm text-muted-foreground">
                        Click "Start Scanning" to begin
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                {!isScanning ? (
                  <Button
                    size="lg"
                    onClick={handleStartScanning}
                    className="px-8"
                    data-testid="button-start-scan"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Start Scanning
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStopScanning}
                    className="px-8"
                    data-testid="button-stop-scan"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Stop Scanning
                  </Button>
                )}
              </div>

              {lastResult && (
                <Card
                  className={`border-2 ${
                    lastResult.valid
                      ? "border-primary bg-primary/5"
                      : "border-destructive bg-destructive/5"
                  }`}
                  data-testid="card-scan-result"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          lastResult.valid
                            ? "bg-primary text-primary-foreground"
                            : "bg-destructive text-destructive-foreground"
                        }`}
                      >
                        {lastResult.valid ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <XCircle className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3
                            className={`text-xl font-bold ${
                              lastResult.valid ? "text-primary" : "text-destructive"
                            }`}
                            data-testid="text-result-status"
                          >
                            {lastResult.valid ? "Entry Granted" : "Entry Denied"}
                          </h3>
                          <p className="text-sm text-muted-foreground" data-testid="text-result-message">
                            {lastResult.message}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Name</p>
                            <p className="font-medium">{lastResult.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Ticket ID</p>
                            <p className="font-mono text-sm">{lastResult.ticketId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Organization</p>
                            <p className="font-medium">{lastResult.organization}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Entries Used</p>
                            <p className="font-mono font-bold">
                              {lastResult.scansUsed + (lastResult.valid ? 1 : 0)}/
                              {lastResult.maxScans}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            Group of {lastResult.groupSize}
                          </Badge>
                          {lastResult.valid && lastResult.scansUsed + 1 === lastResult.maxScans && (
                            <Badge variant="secondary">Last Entry</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>
                Last {scanHistory.length} scan results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No scans yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.map((scan, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border space-y-2"
                      data-testid={`scan-history-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{scan.name}</span>
                        {scan.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">{scan.ticketId}</span>
                        <span>
                          {scan.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
