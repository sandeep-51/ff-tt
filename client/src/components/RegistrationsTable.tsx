import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, QrCode, CheckCircle2, XCircle, Clock, Trash2, Ban, ChevronDown, ChevronRight, User, Mail, Phone, Image as ImageIcon, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TeamMember } from "@shared/schema";

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
  teamMembers?: TeamMember[];
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
  onUpdateRegistration?: (id: string) => void;
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
  onUpdateRegistration,
}: RegistrationsTableProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [editedTeamMembers, setEditedTeamMembers] = useState<TeamMember[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const totalPages = Math.ceil((totalCount || registrations.length) / pageSize);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredRegistrations = registrations.filter((reg) =>
    Object.values(reg).some((value) =>
      value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getStatusBadge = (status: Registration["status"], scans: number, maxScans: number) => {
    const statusConfig = {
      pending: { label: "Pending QR", variant: "secondary" as const, icon: Clock, className: "" },
      active: { label: `Active (${scans}/${maxScans})`, variant: "default" as const, icon: CheckCircle2, className: "" },
      "checked-in": { label: `Checked In (${scans}/${maxScans})`, variant: "default" as const, icon: CheckCircle2, className: "bg-blue-600 hover:bg-blue-700 text-white" },
      exhausted: { label: `Exhausted (${maxScans}/${maxScans})`, variant: "destructive" as const, icon: XCircle, className: "" },
      invalid: { label: "Invalid", variant: "destructive" as const, icon: XCircle, className: "" },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className}`} data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; teamMembers: TeamMember[] }) => {
      const response = await apiRequest("PUT", `/api/admin/registrations/${data.id}`, {
        teamMembers: data.teamMembers,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Updated Successfully",
        description: "Team members have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
      setEditDialogOpen(false);
      onUpdateRegistration?.(editingRegistration?.id || "");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update team members",
        variant: "destructive",
      });
    },
  });

  const handleEditTeamMembers = (registration: Registration) => {
    setEditingRegistration(registration);
    setEditedTeamMembers(registration.teamMembers || []);
    setEditDialogOpen(true);
  };

  const handleSaveTeamMembers = () => {
    if (editingRegistration) {
      updateMutation.mutate({
        id: editingRegistration.id,
        teamMembers: editedTeamMembers,
      });
    }
  };

  const handleAddTeamMember = () => {
    setEditedTeamMembers([...editedTeamMembers, { name: "", email: "", phone: "" }]);
  };

  const handleRemoveTeamMember = (index: number) => {
    setEditedTeamMembers(editedTeamMembers.filter((_, i) => i !== index));
  };

  const handleUpdateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...editedTeamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setEditedTeamMembers(updated);
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
                      <Collapsible key={reg.id} asChild open={expandedRows.has(reg.id)} onOpenChange={() => toggleRow(reg.id)}>
                        <>
                          <TableRow className="h-16" data-testid={`row-registration-${index}`}>
                            <TableCell className="font-mono text-xs" data-testid={`text-id-${index}`}>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-auto">
                                  {expandedRows.has(reg.id) ? (
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 mr-2" />
                                  )}
                                  {reg.id}
                                </Button>
                              </CollapsibleTrigger>
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
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/50">
                                <div className="p-4 space-y-4">
                                  {/* Team Members Section */}
                                  {reg.teamMembers && reg.teamMembers.length > 0 && (
                                    <div>
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                          <User className="h-4 w-4" />
                                          Team Members ({reg.teamMembers.length})
                                        </h4>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditTeamMembers(reg)}
                                          data-testid="button-edit-team-members"
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit Team
                                        </Button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {reg.teamMembers.map((member, idx) => (
                                          <Card key={idx} className="bg-background">
                                            <CardContent className="pt-4 space-y-2">
                                              <div className="flex items-center gap-2">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-medium text-sm">{member.name}</span>
                                              </div>
                                              {member.email && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                  <Mail className="h-3 w-3" />
                                                  <span>{member.email}</span>
                                                </div>
                                              )}
                                              {member.phone && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                  <Phone className="h-3 w-3" />
                                                  <span>{member.phone}</span>
                                                </div>
                                              )}
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom Fields Section */}
                                  {reg.customFieldData && Object.keys(reg.customFieldData).length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold mb-3">Additional Information</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.entries(reg.customFieldData).map(([key, value]) => (
                                          <div key={key} className="flex flex-col gap-1">
                                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
                                            {String(value).startsWith('/attached_assets/') ? (
                                              <div className="flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4 text-primary" />
                                                <a
                                                  href={value}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-primary hover:underline text-sm flex items-center gap-1"
                                                >
                                                  View Uploaded Photo
                                                </a>
                                                <img src={value} alt="Uploaded" className="mt-2 max-w-xs h-32 object-cover rounded border" />
                                              </div>
                                            ) : (
                                              <span className="text-sm">{value}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
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

      {/* Edit Team Members Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Members</DialogTitle>
            <DialogDescription>
              Update team member details for registration {editingRegistration?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editedTeamMembers.map((member, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Member {index + 1}</h4>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveTeamMember(index)}
                      data-testid={`button-remove-member-${index}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${index}`}>Name</Label>
                      <Input
                        id={`name-${index}`}
                        value={member.name}
                        onChange={(e) => handleUpdateTeamMember(index, "name", e.target.value)}
                        placeholder="Member name"
                        data-testid={`input-member-name-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`email-${index}`}>Email</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={member.email || ""}
                        onChange={(e) => handleUpdateTeamMember(index, "email", e.target.value)}
                        placeholder="member@example.com"
                        data-testid={`input-member-email-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`phone-${index}`}>Phone</Label>
                      <Input
                        id={`phone-${index}`}
                        type="tel"
                        value={member.phone || ""}
                        onChange={(e) => handleUpdateTeamMember(index, "phone", e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        data-testid={`input-member-phone-${index}`}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={handleAddTeamMember}
              className="w-full"
              data-testid="button-add-member"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeamMembers} disabled={updateMutation.isPending} data-testid="button-save-team-members">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}