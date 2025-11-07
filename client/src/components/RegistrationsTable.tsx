import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, QrCode, CheckCircle2, XCircle, Clock, Trash2, Ban } from "lucide-react";

export interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  groupSize: number;
  scans: number;
  maxScans: number;
  hasQR: boolean;
  qrCodeData: string | null;
  status: "pending" | "active" | "checked-in" | "exhausted" | "invalid";
  createdAt?: string;
  customFieldData?: Record<string, any>;
}

interface RegistrationsTableProps {
  registrations?: Registration[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onGenerateQR?: (id: string) => void;
  onDeleteRegistration?: (id: string) => void;
  onRevokeQR?: (id: string) => void;
}

export default function RegistrationsTable({
  registrations = [],
  totalCount = 0,
  currentPage = 1,
  pageSize = 50,
  onPageChange,
  onGenerateQR,
  onDeleteRegistration,
  onRevokeQR,
}: RegistrationsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const totalPages = Math.ceil((totalCount || registrations.length) / pageSize);

  const filteredRegistrations = registrations.filter((reg) =>
    Object.values(reg).some((value) =>
      value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getStatusBadge = (status: Registration["status"], scans: number, maxScans: number) => {
    const statusConfig = {
      pending: { label: "Pending QR", variant: "secondary" as const, icon: Clock },
      active: { label: `Active (${scans}/${maxScans})`, variant: "default" as const, icon: CheckCircle2 },
      "checked-in": { label: "Checked In", variant: "default" as const, icon: CheckCircle2 },
      exhausted: { label: `Exhausted (${maxScans}/${maxScans})`, variant: "destructive" as const, icon: XCircle },
      invalid: { label: "Invalid", variant: "destructive" as const, icon: XCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1" data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Registrations</CardTitle>
              <CardDescription>
                {filteredRegistrations.length} of {registrations.length} registrations
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search registrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24 font-mono">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden xl:table-cell">Organization</TableHead>
                    <TableHead className="text-center">Group</TableHead>
                    <TableHead className="text-center">Scans</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                        No registrations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRegistrations.map((reg, index) => (
                      <TableRow key={reg.id} className="h-16" data-testid={`row-registration-${index}`}>
                        <TableCell className="font-mono text-xs" data-testid={`text-id-${index}`}>
                          {reg.id}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-name-${index}`}>
                          {reg.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {reg.email}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {reg.phone}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {reg.organization}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{reg.groupSize}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {reg.scans}/{reg.maxScans}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(reg.status, reg.scans, reg.maxScans)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!reg.hasQR && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  console.log(`Generate QR for ${reg.id}`);
                                  onGenerateQR?.(reg.id);
                                }}
                                data-testid={`button-generate-qr-${index}`}
                              >
                                <QrCode className="h-4 w-4 mr-2" />
                                Generate QR
                              </Button>
                            )}
                            {reg.hasQR && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-revoke-qr-${index}`}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Revoke QR
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke QR Code?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will revoke the QR code for {reg.name} ({reg.id}). The registration will return to pending status and scans will be reset.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => onRevokeQR?.(reg.id)}
                                    >
                                      Revoke
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  data-testid={`button-delete-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Registration?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the registration for {reg.name} ({reg.id}). This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => onDeleteRegistration?.(reg.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {/* Display custom field data */}
          {filteredRegistrations.map((reg) => (
            reg.customFieldData && Object.keys(reg.customFieldData).length > 0 && (
              <div key={reg.id} className="mt-4 p-4 border rounded-lg bg-secondary/20">
                <h4 className="text-lg font-semibold mb-2">Custom Fields for {reg.name}</h4>
                <div className="mt-2 text-sm space-y-1">
                  {Object.entries(reg.customFieldData).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium text-muted-foreground">{key}:</span>
                      {String(value).startsWith('/attached_assets/') ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          View Photo
                        </a>
                      ) : (
                        <span className="font-mono text-xs">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalCount} total registrations)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}