import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Globe, EyeOff, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FormBuilder from "./FormBuilder";
import type { EventForm } from "@shared/schema";
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

export default function FormsList() {
  const { toast } = useToast();
  const [editingFormId, setEditingFormId] = useState<number | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const { data: forms = [], isLoading } = useQuery<EventForm[]>({
    queryKey: ["/api/admin/forms"],
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/admin/forms/${id}/publish`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Form Published",
        description: "Form is now visible to the public",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/admin/forms/${id}/unpublish`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Form Unpublished",
        description: "Form is no longer visible to the public",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/forms/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Form Deleted",
        description: "Form has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete form",
        variant: "destructive",
      });
    },
  });

  if (creatingNew || editingFormId !== null) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => {
            setCreatingNew(false);
            setEditingFormId(null);
          }}
          data-testid="button-back-to-list"
        >
          ← Back to Forms List
        </Button>
        <FormBuilder
          formId={editingFormId || undefined}
          onSuccess={() => {
            setCreatingNew(false);
            setEditingFormId(null);
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Forms</h2>
          <p className="text-muted-foreground">Create and manage registration forms</p>
        </div>
        <Button onClick={() => setCreatingNew(true)} data-testid="button-create-form">
          <Plus className="h-4 w-4 mr-2" />
          Create New Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="space-y-4">
              <div className="text-muted-foreground text-lg">No forms created yet</div>
              <Button onClick={() => setCreatingNew(true)} data-testid="button-create-first-form">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Form
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <Card key={form.id} data-testid={`form-card-${form.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{form.title}</CardTitle>
                      {form.isPublished ? (
                        <Badge variant="default" data-testid={`badge-published-${form.id}`}>
                          <Globe className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-draft-${form.id}`}>
                          Draft
                        </Badge>
                      )}
                    </div>
                    {form.subtitle && (
                      <CardDescription>{form.subtitle}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingFormId(form.id)}
                      data-testid={`button-edit-${form.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {form.isPublished ? (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => unpublishMutation.mutate(form.id)}
                        disabled={unpublishMutation.isPending}
                        data-testid={`button-unpublish-${form.id}`}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => publishMutation.mutate(form.id)}
                        disabled={publishMutation.isPending}
                        data-testid={`button-publish-${form.id}`}
                      >
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          data-testid={`button-delete-${form.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Form</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this form? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(form.id)}
                            data-testid={`button-confirm-delete-${form.id}`}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {form.heroImageUrl && (
                    <div>
                      <span className="text-muted-foreground">Hero Image:</span>
                      <span className="ml-2">✓</span>
                    </div>
                  )}
                  {form.watermarkUrl && (
                    <div>
                      <span className="text-muted-foreground">Watermark:</span>
                      <span className="ml-2">✓</span>
                    </div>
                  )}
                  {form.logoUrl && (
                    <div>
                      <span className="text-muted-foreground">Logo:</span>
                      <span className="ml-2">✓</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="ml-2">
                      {new Date(form.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
