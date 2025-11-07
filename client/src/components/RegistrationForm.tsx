import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Shield, Users, Loader2, Link as LinkIcon, Upload as UploadIcon, Plus, Trash2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EventForm, CustomField } from "@shared/schema";
import freeFireBgImage from "@assets/ChatGPT Image Nov 7, 2025, 12_19_25 AM_1762500965547.png";

const buildDynamicSchema = (customFields: CustomField[] = [], baseFields?: EventForm['baseFields']) => {
  const baseSchema: Record<string, z.ZodTypeAny> = {};

  // Build base fields schema from configuration
  if (baseFields?.name?.enabled) {
    const nameSchema = z.string().min(2, "Name must be at least 2 characters");
    baseSchema.name = baseFields.name.required ? nameSchema : nameSchema.optional().or(z.literal(""));
  }

  if (baseFields?.email?.enabled) {
    const emailSchema = z.string().email("Invalid email address");
    baseSchema.email = baseFields.email.required ? emailSchema : emailSchema.optional().or(z.literal(""));
  }

  if (baseFields?.phone?.enabled) {
    const phoneSchema = z.string().min(10, "Phone number must be at least 10 digits");
    baseSchema.phone = baseFields.phone.required ? phoneSchema : phoneSchema.optional().or(z.literal(""));
  }

  if (baseFields?.organization?.enabled) {
    const orgSchema = z.string().min(2, "Organization must be at least 2 characters");
    baseSchema.organization = baseFields.organization.required ? orgSchema : orgSchema.optional().or(z.literal(""));
  }

  if (baseFields?.groupSize?.enabled) {
    const groupSizeSchema = z.enum(["1", "2", "3", "4"], {
      required_error: "Please select group size",
    });
    baseSchema.groupSize = baseFields.groupSize.required ? groupSizeSchema : groupSizeSchema.optional();
  }

  // Add team members schema with all fields required
  baseSchema.teamMembers = z.array(z.object({
    name: z.string().min(1, "Member name is required"),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    phone: z.string().min(10, "Phone number is required (minimum 10 digits)"),
  })).min(1, "At least one team member is required");
  
  baseSchema.teamMemberCount = z.string().min(1, "Please select number of team members");

  const customFieldsSchema: Record<string, z.ZodTypeAny> = {};

  customFields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "email":
        fieldSchema = z.string().email("Invalid email address");
        break;
      case "phone":
        fieldSchema = z.string().min(10, "Phone number must be at least 10 digits");
        break;
      case "url":
        fieldSchema = z.string().url("Invalid URL");
        break;
      case "photo":
        fieldSchema = z.string().min(1, "Photo is required");
        break;
      default:
        fieldSchema = z.string().min(1, `${field.label} is required`);
    }

    customFieldsSchema[field.id] = field.required ? fieldSchema : fieldSchema.optional().or(z.literal(""));
  });

  return z.object({ ...baseSchema, ...customFieldsSchema });
};

interface RegistrationFormProps {
  publishedForm: EventForm | null;
}

export default function RegistrationForm({ publishedForm }: RegistrationFormProps) {
  const { toast } = useToast();
  const [submittedData, setSubmittedData] = useState<any | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const title = publishedForm?.title || "Event Registration";
  const subtitle = publishedForm?.subtitle || "Register now to receive your secure QR-based entry pass";
  const heroImage = publishedForm?.heroImageUrl || freeFireBgImage;
  const backgroundImage = publishedForm?.backgroundImageUrl || freeFireBgImage; // New: Add background image URL
  const watermarkUrl = publishedForm?.watermarkUrl;
  const logoUrl = publishedForm?.logoUrl;
  const customLinks = publishedForm?.customLinks || [];
  const customFields = publishedForm?.customFields || [];
  const successTitle = publishedForm?.successTitle || "Registration Successful!";
  const successMessage = publishedForm?.successMessage || "Thank you for registering. We've received your information.";
  const baseFields = publishedForm?.baseFields || {
    name: { label: "Full Name", placeholder: "John Doe", required: true, enabled: true },
    email: { label: "Email Address", placeholder: "john.doe@example.com", required: true, enabled: true },
    phone: { label: "Phone Number", placeholder: "+1 (555) 123-4567", required: true, enabled: true },
    organization: { label: "Organization", placeholder: "Acme Corporation", required: true, enabled: true },
    groupSize: { label: "Group Size (Maximum 4 people)", placeholder: "", required: true, enabled: true },
  };

  const registrationSchema = useMemo(() => buildDynamicSchema(customFields, baseFields), [customFields, baseFields]);
  type RegistrationFormData = z.infer<typeof registrationSchema>;

  const defaultValues: any = {};

  if (baseFields.name?.enabled) defaultValues.name = "";
  if (baseFields.email?.enabled) defaultValues.email = "";
  if (baseFields.phone?.enabled) defaultValues.phone = "";
  if (baseFields.organization?.enabled) defaultValues.organization = "";
  if (baseFields.groupSize?.enabled) defaultValues.groupSize = "1";
  
  defaultValues.teamMembers = [{ name: "", email: "", phone: "" }];
  defaultValues.teamMemberCount = "1";

  customFields.forEach((field) => {
    defaultValues[field.id] = "";
  });

  const form = useForm<any>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
  });

  const maxTeamMembers = publishedForm?.baseFields?.groupSize?.maxTeamMembers || 4;
  const [selectedMemberCount, setSelectedMemberCount] = useState(1);

  const { fields: teamMemberFields, append: appendTeamMember, remove: removeTeamMember } = useFieldArray({
    control: form.control,
    name: "teamMembers",
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const response = await apiRequest("POST", "/api/upload-photo", formData);
      return response.json();
    },
  });

  const handlePhotoUpload = async (fieldId: string, file: File) => {
    setUploadingField(fieldId);
    try {
      const result = await uploadPhotoMutation.mutateAsync(file);
      form.setValue(fieldId, result.photoUrl);
      toast({
        title: "Photo Uploaded",
        description: "Photo has been uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const customFieldData: Record<string, string> = {};
      customFields.forEach((field) => {
        if (data[field.id]) {
          customFieldData[field.id] = data[field.id];
        }
      });

      const payload: any = { customFieldData };

      // Only include enabled fields
      if (baseFields.name?.enabled && data.name) payload.name = data.name;
      if (baseFields.email?.enabled && data.email) payload.email = data.email;
      if (baseFields.phone?.enabled && data.phone) payload.phone = data.phone;
      if (baseFields.organization?.enabled && data.organization) payload.organization = data.organization;
      if (baseFields.groupSize?.enabled && data.groupSize) payload.groupSize = parseInt(data.groupSize);
      
      // Add team members
      if (data.teamMembers && data.teamMembers.length > 0) {
        payload.teamMembers = data.teamMembers.filter((m: any) => m.name);
      }

      const response = await apiRequest("POST", "/api/register", payload);
      return response.json();
    },
    onSuccess: (data) => {
      setSubmittedData(data);
      toast({
        title: "Registration Successful",
        description: "Your registration has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    mutation.mutate(data);
  };

  if (submittedData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">{successTitle}</h1>
              <p className="text-lg text-muted-foreground">
                {successMessage}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registration Details</CardTitle>
              <CardDescription>Please save this information for your records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Registration ID</p>
                  <p className="font-medium font-mono">{submittedData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{submittedData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{submittedData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{submittedData.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium">{submittedData.organization}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Group Size</p>
                  <p className="font-medium">{submittedData.groupSize} {submittedData.groupSize === 1 ? 'person' : 'people'}</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Your QR code entry pass will be generated by our admin team</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You will receive your QR code via email shortly. Please bring it with you to the event.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedData(null);
                form.reset();
              }}
              data-testid="button-new-registration"
            >
              Register Another Person
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Full-screen background image */}
      {heroImage && (
        <div className="fixed inset-0 z-0">
          <img
            src={heroImage}
            alt={title}
            className="w-full h-full object-cover object-center"
            style={{ minHeight: '100vh', minWidth: '100vw' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        </div>
      )}

      {/* Admin Login Button - Top Right */}
      <div className="fixed top-4 right-4 z-20">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/admin'}
          className={heroImage ? "bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20" : ""}
        >
          <Shield className="h-4 w-4 mr-2" />
          Admin Login
        </Button>
      </div>

      {/* Content overlay */}
      <div className="relative z-10">
        <div className="relative py-12">
          <div className="text-center space-y-4 px-6 mb-8">
            {logoUrl && (
              <div className="flex justify-center mb-6">
                <img src={logoUrl} alt="Logo" className="h-16 w-auto" />
              </div>
            )}
            <h1 className={`text-4xl md:text-5xl font-bold drop-shadow-lg ${heroImage ? "text-white" : "text-foreground"}`}>{title}</h1>
            <p className={`text-lg md:text-xl max-w-2xl mx-auto drop-shadow-md ${heroImage ? "text-white/90" : "text-muted-foreground"}`}>
              {subtitle}
            </p>
            {watermarkUrl && (
              <div className="flex justify-center mt-8">
                <img src={watermarkUrl} alt="Event" className="h-48 w-auto object-contain drop-shadow-2xl" />
              </div>
            )}
          </div>
        </div>

      <div className="max-w-4xl mx-auto px-6 pb-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <Shield className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Secure Registration</h3>
              <p className="text-sm text-muted-foreground">Your data is protected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Instant Confirmation</h3>
              <p className="text-sm text-muted-foreground">Immediate verification</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <Users className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Group Registration</h3>
              <p className="text-sm text-muted-foreground">Up to 4 people per pass</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registration Form</CardTitle>
            <CardDescription>
              Please fill out all fields to complete your registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {baseFields.name?.enabled && baseFields.name && (
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{baseFields.name?.label} {baseFields.name?.required && "*"}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={baseFields.name?.placeholder || ""}
                            {...field}
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {baseFields.email?.enabled && baseFields.email && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{baseFields.email?.label} {baseFields.email?.required && "*"}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={baseFields.email?.placeholder || ""}
                            {...field}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {baseFields.phone?.enabled && baseFields.phone && (
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{baseFields.phone?.label} {baseFields.phone?.required && "*"}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder={baseFields.phone?.placeholder || ""}
                            {...field}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {baseFields.organization?.enabled && baseFields.organization && (
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{baseFields.organization?.label} {baseFields.organization?.required && "*"}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={baseFields.organization?.placeholder || ""}
                            {...field}
                            data-testid="input-organization"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {baseFields.groupSize?.enabled && baseFields.groupSize && (
                  <FormField
                    control={form.control}
                    name="groupSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{baseFields.groupSize?.label} {baseFields.groupSize?.required && "*"}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                            data-testid="radio-group-size"
                          >
                            {["1", "2", "3", "4"].map((size) => (
                              <div key={size} className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value={size}
                                  id={`size-${size}`}
                                  data-testid={`radio-size-${size}`}
                                />
                                <label
                                  htmlFor={`size-${size}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  {size} {size === "1" ? "person" : "people"}
                                </label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Members *
                    </CardTitle>
                    <CardDescription>Select number of team members and fill in their details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Member Count Selector */}
                    <FormField
                      control={form.control}
                      name="teamMemberCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Team Members *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              const count = parseInt(value);
                              setSelectedMemberCount(count);
                              
                              // Adjust team members array
                              const currentCount = teamMemberFields.length;
                              if (count > currentCount) {
                                for (let i = currentCount; i < count; i++) {
                                  appendTeamMember({ name: "", email: "", phone: "" });
                                }
                              } else if (count < currentCount) {
                                for (let i = currentCount - 1; i >= count; i--) {
                                  removeTeamMember(i);
                                }
                              }
                              field.onChange(value);
                            }}
                            defaultValue="1"
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-member-count">
                                <SelectValue placeholder="Select number of members" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: maxTeamMembers }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} {num === 1 ? 'Member' : 'Members'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Maximum {maxTeamMembers} members allowed per registration
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Team Member Details */}
                    {teamMemberFields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Member {index + 1} Details</h4>
                        </div>
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter member name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="member@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {customFields.map((customField) => {
                  return (
                    <FormField
                      key={customField.id}
                      control={form.control}
                      name={customField.id}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {customField.label} {customField.required && "*"}
                          </FormLabel>
                          <FormControl>
                            {customField.type === "textarea" ? (
                              <Textarea
                                placeholder={customField.placeholder || ""}
                                {...field}
                                rows={4}
                                data-testid={`input-custom-${customField.id}`}
                              />
                            ) : customField.type === "photo" ? (
                              <div className="space-y-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      await handlePhotoUpload(customField.id, file);
                                      e.target.value = "";
                                    }
                                  }}
                                  disabled={uploadingField === customField.id}
                                  data-testid={`input-custom-${customField.id}`}
                                />
                                {uploadingField === customField.id && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Uploading...</span>
                                  </div>
                                )}
                                {field.value && (
                                  <div className="relative w-32 h-32 rounded-md overflow-hidden border">
                                    <img src={field.value} alt="Uploaded" className="w-full h-full object-cover" />
                                  </div>
                                )}
                              </div>
                            ) : customField.type === "payment" ? (
                              <div className="space-y-3">
                                {(customField as any).paymentUrl && (customField as any).paymentUrl.trim() !== '' ? (
                                  <a
                                    href={(customField as any).paymentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors w-full"
                                    data-testid={`button-payment-link-${customField.id}`}
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Proceed to Payment
                                  </a>
                                ) : (
                                  <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                                    Payment link not configured. Please contact the event organizer.
                                  </div>
                                )}
                                <div>
                                  <Input
                                    type="text"
                                    placeholder={customField.placeholder || "Enter transaction ID after payment"}
                                    {...field}
                                    value={field.value || ""}
                                    data-testid={`input-custom-${customField.id}`}
                                  />
                                  {(customField as any).paymentUrl && (customField as any).paymentUrl.trim() !== '' && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Click the button above to complete payment, then enter your transaction ID here
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <Input
                                type={
                                  customField.type === "email"
                                    ? "email"
                                    : customField.type === "phone"
                                    ? "tel"
                                    : customField.type === "url"
                                    ? "url"
                                    : "text"
                                }
                                placeholder={customField.placeholder || ""}
                                {...field}
                                value={field.value || ""}
                                data-testid={`input-custom-${customField.id}`}
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}

                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4">
                  <Shield className="h-4 w-4" />
                  <span>Secure registration • Instant confirmation</span>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={mutation.isPending}
                  data-testid="button-submit-registration"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Custom links */}
        {customLinks.length > 0 && (
          <div className="text-center mt-6 space-y-2">
            {customLinks.map((link: { label: string; url: string }, index: number) => (
              <div key={index}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm inline-flex items-center gap-2 hover:underline ${heroImage ? "text-white/80 hover:text-white" : "text-primary hover:text-primary/80"}`}
                >
                  <LinkIcon className="w-4 h-4" />
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}