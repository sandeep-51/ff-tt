import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, Plus, Trash2, Eye, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EventForm } from "@shared/schema";

const formBuilderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  heroImageUrl: z.string().optional(),
  watermarkUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  customLinks: z.array(z.object({
    label: z.string().min(1, "Label is required"),
    url: z.string().url("Must be a valid URL"),
  })).optional(),
});

type FormBuilderData = z.infer<typeof formBuilderSchema>;

interface FormBuilderProps {
  formId?: number;
  onSuccess?: () => void;
}

export default function FormBuilder({ formId, onSuccess }: FormBuilderProps) {
  const { toast } = useToast();
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [customLinks, setCustomLinks] = useState<Array<{ label: string; url: string }>>([]);

  const { data: existingForm, isLoading: loadingForm } = useQuery<EventForm>({
    queryKey: ["/api/admin/forms", formId],
    enabled: !!formId,
  });

  const form = useForm<FormBuilderData>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: existingForm || {
      title: "",
      subtitle: "",
      description: "",
      customLinks: [],
    },
    values: existingForm ? {
      ...existingForm,
      customLinks: existingForm.customLinks || [],
    } : undefined,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const response = await apiRequest("POST", "/api/admin/upload-image", formData);
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormBuilderData) => {
      const url = formId ? `/api/admin/forms/${formId}` : "/api/admin/forms";
      const method = formId ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: formId ? "Form Updated" : "Form Created",
        description: `Form has been ${formId ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forms"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save form",
        variant: "destructive",
      });
    },
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

  const handleImageUpload = async (field: "heroImageUrl" | "watermarkUrl" | "logoUrl", file: File) => {
    setUploadingField(field);
    try {
      const result = await uploadMutation.mutateAsync(file);
      form.setValue(field, result.imageUrl);
      toast({
        title: "Image Uploaded",
        description: "Image has been uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
    }
  };

  const addCustomLink = () => {
    const links = form.getValues("customLinks") || [];
    form.setValue("customLinks", [...links, { label: "", url: "" }]);
  };

  const removeCustomLink = (index: number) => {
    const links = form.getValues("customLinks") || [];
    form.setValue("customLinks", links.filter((_, i) => i !== index));
  };

  const handleSubmit = (data: FormBuilderData) => {
    saveMutation.mutate(data);
  };

  const handlePublish = () => {
    if (formId) {
      publishMutation.mutate(formId);
    } else {
      toast({
        title: "Save First",
        description: "Please save the form before publishing",
        variant: "destructive",
      });
    }
  };

  if (loadingForm) {
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
          <h2 className="text-2xl font-bold">{formId ? "Edit Form" : "Create New Form"}</h2>
          <p className="text-muted-foreground">Configure your registration form</p>
        </div>
        {formId && existingForm && !existingForm.isPublished && (
          <Button
            onClick={handlePublish}
            disabled={publishMutation.isPending}
            data-testid="button-publish"
          >
            <Globe className="h-4 w-4 mr-2" />
            Publish Form
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Configure the main details of your form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Event Registration" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl>
                      <Input placeholder="Register now to receive your secure QR-based entry pass" {...field} data-testid="input-subtitle" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional information about your event..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Upload hero image, watermark, and logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="heroImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hero Image</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload("heroImageUrl", file);
                          }}
                          disabled={uploadingField === "heroImageUrl"}
                          data-testid="input-hero-image"
                        />
                        {field.value && (
                          <div className="relative w-full h-40 rounded-md overflow-hidden border">
                            <img src={field.value} alt="Hero" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>Background image for the registration form</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="watermarkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Watermark Image</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload("watermarkUrl", file);
                          }}
                          disabled={uploadingField === "watermarkUrl"}
                          data-testid="input-watermark"
                        />
                        {field.value && (
                          <div className="relative w-40 h-40 rounded-md overflow-hidden border bg-card">
                            <img src={field.value} alt="Watermark" className="w-full h-full object-contain p-2" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>Watermark displayed on the form</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload("logoUrl", file);
                          }}
                          disabled={uploadingField === "logoUrl"}
                          data-testid="input-logo"
                        />
                        {field.value && (
                          <div className="relative w-32 h-32 rounded-md overflow-hidden border bg-card">
                            <img src={field.value} alt="Logo" className="w-full h-full object-contain p-2" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>Logo displayed on the form</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Links</CardTitle>
              <CardDescription>Add custom links to display on the form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(form.watch("customLinks") || []).map((link, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <FormField
                    control={form.control}
                    name={`customLinks.${index}.label`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Learn More" {...field} data-testid={`input-link-label-${index}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`customLinks.${index}.url`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} data-testid={`input-link-url-${index}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeCustomLink(index)}
                    data-testid={`button-remove-link-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addCustomLink}
                data-testid="button-add-link"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save-form"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save Form</>
              )}
            </Button>
            {formId && existingForm && (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/", "_blank")}
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
