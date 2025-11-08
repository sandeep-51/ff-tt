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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, Plus, Trash2, Eye, Globe, Image as ImageIcon, Link as LinkIcon, Type, Video, List, GripVertical, Mail, Phone, AlignLeft, DollarSign, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EventForm, CustomField, BaseFieldConfig } from "@shared/schema";
import { customFieldSchema, baseFieldConfigSchema } from "@shared/schema";

const formBuilderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  heroImageUrl: z.string().optional(),
  backgroundImageUrl: z.string().optional(),
  watermarkUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  customLinks: z.array(z.object({
    label: z.string().min(1, "Label is required"),
    url: z.string().url("Must be a valid URL"),
  })).optional(),
  customFields: z.array(customFieldSchema).optional(),
  teamMemberFields: z.array(customFieldSchema).optional(),
  baseFields: z.object({
    name: baseFieldConfigSchema.optional(),
    email: baseFieldConfigSchema.optional(),
    phone: baseFieldConfigSchema.optional(),
    organization: baseFieldConfigSchema.optional(),
    groupSize: baseFieldConfigSchema.optional(),
    teamMembers: baseFieldConfigSchema.optional(),
  }).optional(),
  successMessage: z.string().optional(),
  successTitle: z.string().optional(),
});

type FormBuilderData = z.infer<typeof formBuilderSchema>;

interface FormBuilderProps {
  formId?: number;
  onSuccess?: () => void;
}

// Toolbar element types
type ToolbarElement = {
  type: 'text' | 'email' | 'phone' | 'textarea' | 'url' | 'photo' | 'image' | 'video' | 'payment';
  icon: React.ReactNode;
  label: string;
};

const toolbarElements: ToolbarElement[] = [
  { type: 'text', icon: <Type className="h-5 w-5" />, label: 'Text Field' },
  { type: 'email', icon: <Mail className="h-5 w-5" />, label: 'Email Field' },
  { type: 'phone', icon: <Phone className="h-5 w-5" />, label: 'Phone Field' },
  { type: 'textarea', icon: <AlignLeft className="h-5 w-5" />, label: 'Text Area' },
  { type: 'url', icon: <LinkIcon className="h-5 w-5" />, label: 'URL Field' },
  { type: 'photo', icon: <ImageIcon className="h-5 w-5" />, label: 'Photo Upload' },
  { type: 'image', icon: <ImageIcon className="h-5 w-5" />, label: 'Image Display' },
  { type: 'video', icon: <Video className="h-5 w-5" />, label: 'Video' },
  { type: 'payment', icon: <DollarSign className="h-5 w-5" />, label: 'Payment Link' },
];

export default function FormBuilder({ formId, onSuccess }: FormBuilderProps) {
  const { toast } = useToast();
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [customLinks, setCustomLinks] = useState<Array<{ label: string; url: string }>>([]);
  const [showToolbar, setShowToolbar] = useState(true);

  const { data: existingForm, isLoading: loadingForm } = useQuery<EventForm>({
    queryKey: ["/api/admin/forms", formId],
    enabled: !!formId,
  });

  const form = useForm<FormBuilderData>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      backgroundImageUrl: "",
      customLinks: [],
      customFields: [],
      teamMemberFields: [],
      baseFields: {
        name: { label: "Full Name", placeholder: "John Doe", required: true, enabled: true },
        email: { label: "Email Address", placeholder: "john.doe@example.com", required: true, enabled: true },
        phone: { label: "Phone Number", placeholder: "+1 (555) 123-4567", required: true, enabled: true },
        organization: { label: "Organization", placeholder: "Acme Corporation", required: true, enabled: true },
        groupSize: { label: "Group Size (Maximum 4 people)", placeholder: "", required: true, enabled: true },
        teamMembers: { 
          label: "Team Members", 
          placeholder: "Select number of team members and fill in their details", 
          required: true, 
          enabled: true,
          maxTeamMembers: 4,
          memberNameLabel: "Full Name",
          memberNamePlaceholder: "Enter member name",
          memberEmailLabel: "Email",
          memberEmailPlaceholder: "member@example.com",
          memberPhoneLabel: "Phone Number",
          memberPhonePlaceholder: "+1 (555) 123-4567",
          memberNameConfig: { enabled: true, required: true, label: "Full Name", placeholder: "Enter member name" },
          memberEmailConfig: { enabled: true, required: true, label: "Email", placeholder: "member@example.com" },
          memberPhoneConfig: { enabled: true, required: true, label: "Phone Number", placeholder: "+1 (555) 123-4567" },
        },
      },
      successTitle: "",
      successMessage: "",
    },
    values: existingForm ? {
      title: existingForm.title,
      subtitle: existingForm.subtitle || undefined,
      description: existingForm.description || undefined,
      heroImageUrl: existingForm.heroImageUrl || undefined,
      backgroundImageUrl: existingForm.backgroundImageUrl || undefined,
      watermarkUrl: existingForm.watermarkUrl || undefined,
      logoUrl: existingForm.logoUrl || undefined,
      customLinks: existingForm.customLinks || [],
      customFields: existingForm.customFields || [],
      teamMemberFields: existingForm.teamMemberFields || [],
      baseFields: existingForm.baseFields || {
        name: { label: "Full Name", placeholder: "John Doe", required: true, enabled: true },
        email: { label: "Email Address", placeholder: "john.doe@example.com", required: true, enabled: true },
        phone: { label: "Phone Number", placeholder: "+1 (555) 123-4567", required: true, enabled: true },
        organization: { label: "Organization", placeholder: "Acme Corporation", required: true, enabled: true },
        groupSize: { label: "Group Size (Maximum 4 people)", placeholder: "", required: true, enabled: true },
        teamMembers: { 
          label: "Team Members", 
          placeholder: "Select number of team members and fill in their details", 
          required: true, 
          enabled: true,
          maxTeamMembers: 4,
          memberNameLabel: "Full Name",
          memberNamePlaceholder: "Enter member name",
          memberEmailLabel: "Email",
          memberEmailPlaceholder: "member@example.com",
          memberPhoneLabel: "Phone Number",
          memberPhonePlaceholder: "+1 (555) 123-4567",
          memberNameConfig: { enabled: true, required: true, label: "Full Name", placeholder: "Enter member name" },
          memberEmailConfig: { enabled: true, required: true, label: "Email", placeholder: "member@example.com" },
          memberPhoneConfig: { enabled: true, required: true, label: "Phone Number", placeholder: "+1 (555) 123-4567" },
        },
      },
      successTitle: existingForm.successTitle || undefined,
      successMessage: existingForm.successMessage || undefined,
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

  const handleImageUpload = async (field: "heroImageUrl" | "backgroundImageUrl" | "watermarkUrl" | "logoUrl", file: File) => {
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

  const addCustomField = (fieldType: 'text' | 'email' | 'phone' | 'textarea' | 'url' | 'photo' | 'payment' = 'text') => {
    const fields = form.getValues("customFields") || [];
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: "",
      required: false,
      placeholder: "",
    };
    if (fieldType === 'payment') {
      (newField as any).paymentUrl = ""; // Add paymentUrl property for payment type
    }
    form.setValue("customFields", [...fields, newField]);
  };

  const addElementFromToolbar = (elementType: ToolbarElement['type']) => {
    if (['text', 'email', 'phone', 'textarea', 'url', 'photo', 'payment'].includes(elementType)) {
      addCustomField(elementType as any);
      toast({
        title: "Field Added",
        description: `${elementType.charAt(0).toUpperCase() + elementType.slice(1)} field added to form`,
      });
    } else {
      toast({
        title: "Coming Soon",
        description: `${elementType} element will be supported soon`,
      });
    }
  };

  const removeCustomField = (index: number) => {
    const fields = form.getValues("customFields") || [];
    form.setValue("customFields", fields.filter((_, i) => i !== index));
  };

  const duplicateCustomField = (index: number) => {
    const fields = form.getValues("customFields") || [];
    const fieldToDuplicate = fields[index];
    const duplicatedField: CustomField = {
      ...fieldToDuplicate,
      id: `field_${Date.now()}`,
      label: `${fieldToDuplicate.label} (Copy)`,
    };
    form.setValue("customFields", [...fields.slice(0, index + 1), duplicatedField, ...fields.slice(index + 1)]);
    toast({
      title: "Field Duplicated",
      description: "Field has been duplicated successfully",
    });
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const fields = form.getValues("customFields") || [];
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    form.setValue("customFields", newFields);
  };

  const moveFieldDown = (index: number) => {
    const fields = form.getValues("customFields") || [];
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    form.setValue("customFields", newFields);
  };

  const addTeamMemberField = (fieldType: 'text' | 'email' | 'phone' | 'textarea' | 'url' | 'photo' = 'text') => {
    const fields = form.getValues("teamMemberFields") || [];
    const newField: CustomField = {
      id: `member_field_${Date.now()}`,
      type: fieldType,
      label: "",
      required: false,
      placeholder: "",
    };
    form.setValue("teamMemberFields", [...fields, newField]);
  };

  const removeTeamMemberField = (index: number) => {
    const fields = form.getValues("teamMemberFields") || [];
    form.setValue("teamMemberFields", fields.filter((_, i) => i !== index));
  };

  const duplicateTeamMemberField = (index: number) => {
    const fields = form.getValues("teamMemberFields") || [];
    const fieldToDuplicate = fields[index];
    const duplicatedField: CustomField = {
      ...fieldToDuplicate,
      id: `member_field_${Date.now()}`,
      label: `${fieldToDuplicate.label} (Copy)`,
    };
    form.setValue("teamMemberFields", [...fields.slice(0, index + 1), duplicatedField, ...fields.slice(index + 1)]);
    toast({
      title: "Field Duplicated",
      description: "Team member field has been duplicated successfully",
    });
  };

  const moveTeamMemberFieldUp = (index: number) => {
    if (index === 0) return;
    const fields = form.getValues("teamMemberFields") || [];
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    form.setValue("teamMemberFields", newFields);
  };

  const moveTeamMemberFieldDown = (index: number) => {
    const fields = form.getValues("teamMemberFields") || [];
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    form.setValue("teamMemberFields", newFields);
  };

  const handleSubmit = (data: FormBuilderData) => {
    console.log("Form submission started with data:", data);
    console.log("Form errors:", form.formState.errors);

    // Validate payment fields have payment URLs
    const paymentFields = data.customFields?.filter(f => f.type === 'payment') || [];
    const invalidPaymentFields = paymentFields.filter(f => !(f as any).paymentUrl || (f as any).paymentUrl.trim() === '');

    if (invalidPaymentFields.length > 0) {
      console.error("Payment field validation failed:", invalidPaymentFields);
      toast({
        title: "Validation Error",
        description: "All payment fields must have a payment link URL. Please fill in the payment URL for all payment fields.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...data,
      customFields: data.customFields?.map(field => ({
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder || "",
        required: field.required,
        helpText: field.helpText || "",
        ...(field.type === "payment" && { paymentUrl: field.paymentUrl || "" }),
      })),
      teamMemberFields: data.teamMemberFields?.map(field => ({
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder || "",
        required: field.required,
        helpText: field.helpText || "",
      })),
    };

    console.log("Submitting payload:", payload);
    saveMutation.mutate(payload as any);
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
    <div className="flex gap-4">
      {/* Sidebar Toolbar */}
      {showToolbar && (
        <Card className="w-16 flex-shrink-0 sticky top-4 h-fit">
          <CardContent className="p-2 space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-full h-12"
              onClick={() => setShowToolbar(false)}
              title="Close toolbar"
            >
              <List className="h-5 w-5" />
            </Button>
            {toolbarElements.map((element) => (
              <Button
                key={element.type}
                type="button"
                variant="ghost"
                size="icon"
                className="w-full h-12 hover:bg-primary/10"
                onClick={() => addElementFromToolbar(element.type)}
                title={element.label}
              >
                {element.icon}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Form Content */}
      <div className="flex-1 space-y-6">
        {!showToolbar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowToolbar(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Show Element Toolbar
          </Button>
        )}

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
              <CardTitle>Success Message</CardTitle>
              <CardDescription>Customize the message shown after successful form submission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="successTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Success Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Registration Successful!" {...field} data-testid="input-success-title" />
                    </FormControl>
                    <FormDescription>The title shown on the success page (leave empty for default)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="successMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Success Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Thank you for registering! We will contact you shortly with your QR code."
                        className="resize-none"
                        rows={4}
                        {...field}
                        data-testid="textarea-success-message"
                      />
                    </FormControl>
                    <FormDescription>The message shown after successful registration (leave empty for default)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Fields Configuration</CardTitle>
              <CardDescription>Customize labels, placeholders, and requirements for each field</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["name", "email", "phone", "organization", "groupSize"].map((fieldName) => (
                <div key={fieldName} className="p-4 border rounded-md space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">{fieldName.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <FormField
                      control={form.control}
                      name={`baseFields.${fieldName}.enabled` as any}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormLabel className="text-sm">Enabled</FormLabel>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid={`checkbox-field-${fieldName}-enabled`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`baseFields.${fieldName}.label` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Label</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter label" {...field} data-testid={`input-field-${fieldName}-label`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`baseFields.${fieldName}.placeholder` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Placeholder</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter placeholder" {...field} value={field.value || ""} data-testid={`input-field-${fieldName}-placeholder`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`baseFields.${fieldName}.helpText` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Help Text / Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add helpful instructions for users..." 
                            {...field} 
                            value={field.value || ""} 
                            rows={2}
                            data-testid={`textarea-field-${fieldName}-help`} 
                          />
                        </FormControl>
                        <FormDescription>This note will be shown below the field to guide users</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`baseFields.${fieldName}.required` as any}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid={`checkbox-field-${fieldName}-required`}
                          />
                        </FormControl>
                        <FormLabel className="text-sm">Required</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              ))}

              {/* Team Members Configuration */}
              <div className="p-4 border rounded-md space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Team Members</h4>
                  <FormField
                    control={form.control}
                    name="baseFields.teamMembers.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormLabel className="text-sm">Enabled</FormLabel>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-field-teamMembers-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="baseFields.teamMembers.label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Section Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Team Members" {...field} data-testid="input-field-teamMembers-label" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="baseFields.teamMembers.placeholder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Select number of team members and fill in their details" {...field} value={field.value || ""} data-testid="input-field-teamMembers-placeholder" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.helpText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Help Text / Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add helpful instructions for team member registration..." 
                          {...field} 
                          value={field.value || ""} 
                          rows={2}
                          data-testid="textarea-field-teamMembers-help" 
                        />
                      </FormControl>
                      <FormDescription>This note will be shown to guide users</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.maxTeamMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Maximum Team Members Allowed</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          placeholder="Enter max team members (0-20)"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          value={field.value ?? 4}
                          data-testid="input-max-team-members"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        <strong>0</strong> = Solo only (no team members allowed)<br/>
                        <strong>1-20</strong> = Users can select from Solo up to this number<br/>
                        Default: 4
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.memberNameLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Member Name Field Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} value={field.value || ""} data-testid="input-field-teamMembers-nameLabel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.memberNamePlaceholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Member Name Field Placeholder</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter member name" {...field} value={field.value || ""} data-testid="input-field-teamMembers-namePlaceholder" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.memberEmailLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Member Email Field Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" {...field} value={field.value || ""} data-testid="input-field-teamMembers-emailLabel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.memberEmailPlaceholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Member Email Field Placeholder</FormLabel>
                      <FormControl>
                        <Input placeholder="member@example.com" {...field} value={field.value || ""} data-testid="input-field-teamMembers-emailPlaceholder" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.memberPhoneLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Member Phone Field Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone Number" {...field} value={field.value || ""} data-testid="input-field-teamMembers-phoneLabel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.memberPhonePlaceholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Member Phone Field Placeholder</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} value={field.value || ""} data-testid="input-field-teamMembers-phonePlaceholder" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <h5 className="font-medium text-sm mb-3">Individual Member Field Settings</h5>
                  <p className="text-xs text-gray-500 mb-3">Control which fields appear for each team member</p>
                  
                  {/* Member Name Field Configuration */}
                  <div className="p-3 border rounded-md space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <h6 className="text-sm font-medium">Member Name Field</h6>
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="baseFields.teamMembers.memberNameConfig.enabled"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormLabel className="text-xs">Show</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-memberName-enabled"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="baseFields.teamMembers.memberNameConfig.required"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormLabel className="text-xs">Required</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-memberName-required"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Member Email Field Configuration */}
                  <div className="p-3 border rounded-md space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <h6 className="text-sm font-medium">Member Email Field</h6>
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="baseFields.teamMembers.memberEmailConfig.enabled"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormLabel className="text-xs">Show</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-memberEmail-enabled"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="baseFields.teamMembers.memberEmailConfig.required"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormLabel className="text-xs">Required</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-memberEmail-required"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Member Phone Field Configuration */}
                  <div className="p-3 border rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <h6 className="text-sm font-medium">Member Phone Field</h6>
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="baseFields.teamMembers.memberPhoneConfig.enabled"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormLabel className="text-xs">Show</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-memberPhone-enabled"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="baseFields.teamMembers.memberPhoneConfig.required"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormLabel className="text-xs">Required</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-memberPhone-required"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="baseFields.teamMembers.required"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-field-teamMembers-required"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Required</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registration Fee</CardTitle>
              <CardDescription>Configure the registration fee amount and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="baseFields.teamMembers.registrationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="99"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || 99}
                        data-testid="input-registration-fee"
                      />
                    </FormControl>
                    <FormDescription>
                      The registration fee per slot (default: ₹99)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseFields.teamMembers.registrationFeeDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="You are buying ONE slot. The fee is fixed at ₹99 whether you play Solo, Duo, Trio, or Full Squad."
                        {...field}
                        value={field.value || ""}
                        rows={3}
                        data-testid="textarea-fee-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Additional information about the registration fee
                    </FormDescription>
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
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleImageUpload("heroImageUrl", file);
                                e.target.value = '';
                              }
                            }}
                            disabled={uploadingField === "heroImageUrl"}
                            data-testid="input-hero-image"
                          />
                          {uploadingField === "heroImageUrl" && (
                            <Loader2 className="h-4 w-4 animate-spin self-center" />
                          )}
                        </div>
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
                name="backgroundImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Background Image</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleImageUpload("backgroundImageUrl", file);
                                e.target.value = '';
                              }
                            }}
                            disabled={uploadingField === "backgroundImageUrl"}
                            data-testid="input-background-image"
                          />
                          {uploadingField === "backgroundImageUrl" && (
                            <Loader2 className="h-4 w-4 animate-spin self-center" />
                          )}
                        </div>
                        {field.value && (
                          <div className="relative w-full h-40 rounded-md overflow-hidden border">
                            <img src={field.value} alt="Form Background" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>Background image for the entire registration form</FormDescription>
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
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleImageUpload("watermarkUrl", file);
                                e.target.value = '';
                              }
                            }}
                            disabled={uploadingField === "watermarkUrl"}
                            data-testid="input-watermark"
                          />
                          {uploadingField === "watermarkUrl" && (
                            <Loader2 className="h-4 w-4 animate-spin self-center" />
                          )}
                        </div>
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
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleImageUpload("logoUrl", file);
                                e.target.value = '';
                              }
                            }}
                            disabled={uploadingField === "logoUrl"}
                            data-testid="input-logo"
                          />
                          {uploadingField === "logoUrl" && (
                            <Loader2 className="h-4 w-4 animate-spin self-center" />
                          )}
                        </div>
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

          <Card>
            <CardHeader>
              <CardTitle>Custom Form Fields</CardTitle>
              <CardDescription>Add additional fields for registrants to fill. Use the toolbar on the left to quickly add elements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(form.watch("customFields") || []).map((customField, index) => (
                <div key={customField.id} className="p-4 border rounded-md space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`customFields.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-field-type-${index}`}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="textarea">Long Text</SelectItem>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="photo">Photo Upload</SelectItem>
                              <SelectItem value="payment">Payment Link</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`customFields.${index}.label`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Label</FormLabel>
                          <FormControl>
                            <Input placeholder="Field label" {...field} data-testid={`input-field-label-${index}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`customFields.${index}.placeholder`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-sm">Placeholder</FormLabel>
                        <FormControl>
                          <Input placeholder="Placeholder text" {...field} value={field.value || ""} data-testid={`input-field-placeholder-${index}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {customField.type === 'payment' && (
                    <FormField
                      control={form.control}
                      name={`customFields.${index}.paymentUrl` as any}
                      render={({ field: paymentUrlField }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Payment Link URL *</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://payment-gateway.com/your-link"
                              {...paymentUrlField}
                              value={paymentUrlField.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name={`customFields.${index}.helpText`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-sm">Help Text / Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add helpful instructions for users..." 
                            {...field} 
                            value={field.value || ""} 
                            rows={2}
                            data-testid={`textarea-field-help-${index}`} 
                          />
                        </FormControl>
                        <FormDescription>This note will be shown below the field to guide users</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 items-end">

                    <FormField
                      control={form.control}
                      name={`customFields.${index}.required`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 pb-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid={`checkbox-field-required-${index}`}
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Required</FormLabel>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveFieldUp(index)}
                      disabled={index === 0}
                      data-testid={`button-move-up-field-${index}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveFieldDown(index)}
                      disabled={index === (form.getValues("customFields") || []).length - 1}
                      data-testid={`button-move-down-field-${index}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => duplicateCustomField(index)}
                      data-testid={`button-duplicate-field-${index}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeCustomField(index)}
                      data-testid={`button-remove-field-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addCustomField()}
                data-testid="button-add-custom-field"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Member Custom Fields</CardTitle>
              <CardDescription>Add custom fields that will appear for each team member (in addition to basic name/email/phone fields)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(form.watch("teamMemberFields") || []).map((memberField, index) => (
                <div key={memberField.id} className="p-4 border rounded-md space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`teamMemberFields.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-member-field-type-${index}`}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="textarea">Long Text</SelectItem>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="photo">Photo Upload</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`teamMemberFields.${index}.label`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Label</FormLabel>
                          <FormControl>
                            <Input placeholder="Field label" {...field} data-testid={`input-member-field-label-${index}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`teamMemberFields.${index}.placeholder`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-sm">Placeholder</FormLabel>
                        <FormControl>
                          <Input placeholder="Placeholder text" {...field} value={field.value || ""} data-testid={`input-member-field-placeholder-${index}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`teamMemberFields.${index}.helpText`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-sm">Help Text / Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add helpful instructions for users..." 
                            {...field} 
                            value={field.value || ""} 
                            rows={2}
                            data-testid={`textarea-member-field-help-${index}`} 
                          />
                        </FormControl>
                        <FormDescription>This note will be shown below the field to guide users</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 items-end">
                    <FormField
                      control={form.control}
                      name={`teamMemberFields.${index}.required`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 pb-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid={`checkbox-member-field-required-${index}`}
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Required</FormLabel>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveTeamMemberFieldUp(index)}
                      disabled={index === 0}
                      data-testid={`button-move-up-member-field-${index}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => moveTeamMemberFieldDown(index)}
                      disabled={index === (form.getValues("teamMemberFields") || []).length - 1}
                      data-testid={`button-move-down-member-field-${index}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => duplicateTeamMemberField(index)}
                      data-testid={`button-duplicate-member-field-${index}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeTeamMemberField(index)}
                      data-testid={`button-remove-member-field-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTeamMemberField('text')}
                  data-testid="button-add-team-member-text-field"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Text Field
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTeamMemberField('photo')}
                  data-testid="button-add-team-member-photo-field"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Photo Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTeamMemberField('email')}
                  data-testid="button-add-team-member-email-field"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Email Field
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTeamMemberField('phone')}
                  data-testid="button-add-team-member-phone-field"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Phone Field
                </Button>
              </div>
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
                onClick={() => {
                  toast({
                    title: "Preview Tip",
                    description: "Make sure to save your changes before previewing. The preview shows the last saved version.",
                  });
                  setTimeout(() => window.open("/", "_blank"), 500);
                }}
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Form
              </Button>
            )}
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
}