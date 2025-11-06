import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Registration } from "./RegistrationsTable";

interface QRGeneratorProps {
  registrations?: Registration[];
  onGenerate?: (id: string) => void;
  siteUrl?: string;
}

export default function QRGenerator({
  registrations = [],
  onGenerate,
  siteUrl = "https://yourdomain.com",
}: QRGeneratorProps) {
  const { toast } = useToast();
  const [generatedQRs, setGeneratedQRs] = useState<Set<string>>(new Set());

  const pendingRegistrations = registrations.filter((reg) => !reg.hasQR);

  const handleGenerate = (id: string) => {
    console.log(`Generating QR for ${id}`);
    setGeneratedQRs((prev) => new Set(prev).add(id));
    onGenerate?.(id);
    toast({
      title: "QR Code Generated",
      description: `QR code created for registration ${id}`,
    });
  };

  const handleCopyURL = (id: string) => {
    const url = `${siteUrl}/verify?t=${id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Verification URL copied to clipboard",
    });
  };

  const handleDownloadQR = (id: string) => {
    console.log(`Downloading QR for ${id}`);
    toast({
      title: "Download Started",
      description: `QR code for ${id} is being downloaded`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Generate QR Codes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingRegistrations.length} registrations pending QR generation
          </p>
        </div>
      </div>

      {pendingRegistrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">All QR Codes Generated</h3>
              <p className="text-sm text-muted-foreground mt-1">
                There are no pending registrations requiring QR codes
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingRegistrations.map((reg) => {
            const isGenerated = generatedQRs.has(reg.id);

            return (
              <Card key={reg.id} data-testid={`card-qr-${reg.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{reg.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        ID: {reg.id}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      Group of {reg.groupSize}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <span>{reg.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Organization:</span>{" "}
                      <span>{reg.organization}</span>
                    </div>
                  </div>

                  {!isGenerated ? (
                    <Button
                      onClick={() => handleGenerate(reg.id)}
                      className="w-full"
                      data-testid={`button-generate-${reg.id}`}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate QR Code
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center p-6 bg-muted rounded-lg">
                        <div className="h-48 w-48 bg-white rounded-lg flex items-center justify-center border-2 border-border">
                          <QrCode className="h-32 w-32 text-muted-foreground" data-testid={`qr-preview-${reg.id}`} />
                          <span className="sr-only">QR Code Preview for {reg.id}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Verification URL:</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 text-xs bg-muted rounded-lg font-mono truncate">
                            {siteUrl}/verify?t={reg.id}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleCopyURL(reg.id)}
                            data-testid={`button-copy-url-${reg.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDownloadQR(reg.id)}
                          data-testid={`button-download-${reg.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(`${siteUrl}/verify?t=${reg.id}`, "_blank")}
                          data-testid={`button-open-url-${reg.id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open URL
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>QR Code Generated Successfully</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
