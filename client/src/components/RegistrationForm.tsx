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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Shield, Users, Loader2, Link as LinkIcon, Upload as UploadIcon, Plus, Trash2, DollarSign, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EventForm, CustomField } from "@shared/schema";
import freeFireBgImage from "@assets/ChatGPT Image Nov 7, 2025, 12_19_25 AM_1762500965547.png";

const buildDynamicSchema = (customFields: CustomField[] = [], baseFields?: EventForm['baseFields'], teamMemberFields?: CustomField[]) => {
  const baseSchema: Record<string, z.ZodTypeAny> = {};

  // Build base fields schema from configuration
  if (baseFields?.name?.enabled) {
    const nameSchema = z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters");
    baseSchema.name = baseFields.name.required ? nameSchema : z.string().optional().or(z.literal(""));
  }

  if (baseFields?.email?.enabled) {
    const emailSchema = z.string().min(1, "Email is required").email("Invalid email address");
    baseSchema.email = baseFields.email.required ? emailSchema : z.string().optional().or(z.literal(""));
  }

  if (baseFields?.phone?.enabled) {
    const phoneSchema = z.string().min(1, "Phone is required").min(10, "Phone number must be at least 10 digits");
    baseSchema.phone = baseFields.phone.required ? phoneSchema : z.string().optional().or(z.literal(""));
  }

  if (baseFields?.organization?.enabled) {
    const orgSchema = z.string().min(1, "Organization is required").min(2, "Organization must be at least 2 characters");
    baseSchema.organization = baseFields.organization.required ? orgSchema : z.string().optional().or(z.literal(""));
  }

  if (baseFields?.groupSize?.enabled) {
    const groupSizeSchema = z.enum(["1", "2", "3", "4"], {
      required_error: "Please select group size",
    });
    baseSchema.groupSize = baseFields.groupSize.required ? groupSizeSchema : groupSizeSchema.optional();
  }

  // Add team members schema based on configuration
  if (baseFields?.teamMembers?.enabled) {
    const teamMemberFieldsSchema: Record<string, z.ZodTypeAny> = {};

    // Member Name Field
    const memberNameConfig = baseFields.teamMembers.memberNameConfig;
    if (memberNameConfig?.enabled !== false) {
      const nameSchema = z.string().min(1, "Member name is required");
      teamMemberFieldsSchema.name = memberNameConfig?.required !== false
        ? nameSchema
        : z.string().optional().or(z.literal(""));
    }

    // Member Email Field
    const memberEmailConfig = baseFields.teamMembers.memberEmailConfig;
    if (memberEmailConfig?.enabled !== false) {
      const emailSchema = z.string().email("Invalid email").optional().or(z.literal(""));
      const requiredEmailSchema = z.string().min(1, "Email is required").email("Invalid email");
      teamMemberFieldsSchema.email = memberEmailConfig?.required !== false
        ? requiredEmailSchema
        : emailSchema;
    }

    // Member Phone Field
    const memberPhoneConfig = baseFields.teamMembers.memberPhoneConfig;
    if (memberPhoneConfig?.enabled !== false) {
      const phoneSchema = z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal(""));
      const requiredPhoneSchema = z.string().min(1, "Phone is required").min(10, "Phone number must be at least 10 digits");
      teamMemberFieldsSchema.phone = memberPhoneConfig?.required !== false
        ? requiredPhoneSchema
        : phoneSchema;
    }

    // Add custom team member fields
    (teamMemberFields || []).forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case "email":
          fieldSchema = z.string().min(1, "Email is required").email("Invalid email address");
          break;
        case "phone":
          fieldSchema = z.string().min(1, "Phone is required").min(10, "Phone number must be at least 10 digits");
          break;
        case "url":
          fieldSchema = z.string().min(1, "URL is required").url("Invalid URL");
          break;
        case "photo":
          fieldSchema = z.string().min(1, "Photo is required");
          break;
        default:
          fieldSchema = z.string().min(1, `${field.label} is required`);
      }

      teamMemberFieldsSchema[field.id] = field.required ? fieldSchema : z.string().optional().or(z.literal(""));
    });

    baseSchema.teamMembers = z.array(z.object(teamMemberFieldsSchema)).optional();
  }

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
  const backgroundImage = publishedForm?.backgroundImageUrl || freeFireBgImage;
  const watermarkUrl = publishedForm?.watermarkUrl;
  const logoUrl = publishedForm?.logoUrl;
  const customLinks = publishedForm?.customLinks || [];
  const customFields = publishedForm?.customFields || [];
  const teamMemberCustomFields = publishedForm?.teamMemberFields || [];
  const successTitle = publishedForm?.successTitle || "Registration Successful!";
  const successMessage = publishedForm?.successMessage || "Thank you for registering. We've received your information.";
  const baseFields = publishedForm?.baseFields || {
    name: { label: "Full Name", placeholder: "John Doe", required: true, enabled: true },
    email: { label: "Email Address", placeholder: "john.doe@example.com", required: true, enabled: true },
    phone: { label: "Phone Number", placeholder: "+1 (555) 123-4567", required: true, enabled: true },
    organization: { label: "Organization", placeholder: "Acme Corporation", required: true, enabled: true },
    groupSize: { label: "Group Size (Maximum 4 people)", placeholder: "", required: true, enabled: true },
  };
  const teamMembersConfig = publishedForm?.baseFields?.teamMembers || {
    enabled: true,
    label: "Team Members",
    placeholder: "Select number of team members and fill in their details",
    required: true,
    helpText: "",
    memberNameLabel: "Full Name",
    memberNamePlaceholder: "Enter member name",
    memberEmailLabel: "Email",
    memberEmailPlaceholder: "member@example.com",
    memberPhoneLabel: "Phone Number",
    memberPhonePlaceholder: "+1 (555) 123-4567",
  };

  const registrationSchema = useMemo(() => buildDynamicSchema(customFields, baseFields, teamMemberCustomFields), [customFields, baseFields, teamMemberCustomFields]);
  type RegistrationFormData = z.infer<typeof registrationSchema>;

  const defaultValues: any = {};

  if (baseFields.name?.enabled) defaultValues.name = "";
  if (baseFields.email?.enabled) defaultValues.email = "";
  if (baseFields.phone?.enabled) defaultValues.phone = "";
  if (baseFields.organization?.enabled) defaultValues.organization = "";
  if (baseFields.groupSize?.enabled) defaultValues.groupSize = "1";

  // Initialize team members array with 1 member by default
  const teamMemberDefaults: any = {};

  // Add base fields to defaults
  const memberNameConfig = teamMembersConfig.memberNameConfig;
  if (memberNameConfig?.enabled !== false) {
    teamMemberDefaults.name = "";
  }

  const memberEmailConfig = teamMembersConfig.memberEmailConfig;
  if (memberEmailConfig?.enabled !== false) {
    teamMemberDefaults.email = "";
  }

  const memberPhoneConfig = teamMembersConfig.memberPhoneConfig;
  if (memberPhoneConfig?.enabled !== false) {
    teamMemberDefaults.phone = "";
  }

  // Add custom fields to defaults
  teamMemberCustomFields.forEach((field) => {
    teamMemberDefaults[field.id] = "";
  });

  if (baseFields.teamMembers?.enabled) {
    defaultValues.teamMembers = [];
  }

  customFields.forEach((field) => {
    defaultValues[field.id] = "";
  });

  const form = useForm<any>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
  });

  const maxTeamMembers = publishedForm?.baseFields?.teamMembers?.maxTeamMembers || 4;
  const [selectedMemberCount, setSelectedMemberCount] = useState(0);

  const { fields: teamMemberFields, append: appendTeamMember, remove: removeTeamMember } = useFieldArray({
    control: form.control,
    name: "teamMembers",
  });

  const handleMemberCountChange = (count: string) => {
    const newCount = parseInt(count);
    setSelectedMemberCount(newCount);

    const currentCount = teamMemberFields.length;

    if (newCount === 0) {
      // Remove all team members
      for (let i = currentCount - 1; i >= 0; i--) {
        removeTeamMember(i);
      }
    } else if (newCount > currentCount) {
      for (let i = currentCount; i < newCount; i++) {
        appendTeamMember({ name: "", email: "", phone: "" });
      }
    } else if (newCount < currentCount) {
      for (let i = currentCount - 1; i >= newCount; i--) {
        removeTeamMember(i);
      }
    }
  };

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
      console.log("📝 Form data being submitted:", data);

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

      // Add team members (can be empty array if 0 selected)
      if (data.teamMembers) {
        payload.teamMembers = data.teamMembers.filter((m: any) => m.name || m.email || m.phone);
      } else {
        payload.teamMembers = [];
      }

      console.log("📤 Sending payload:", payload);
      const response = await apiRequest("POST", "/api/register", payload);
      const result = await response.json();
      console.log("✅ Registration response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("🎉 Registration successful!", data);
      setSubmittedData(data);
      toast({
        title: "Registration Successful",
        description: "Your registration has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log("🚀 Attempting to submit form...");
    console.log("Form validation passed, data:", data);
    console.log("Form errors:", form.formState.errors);
    mutation.mutate(data);
  };

  const handleSubmitError = (errors: any) => {
    console.error("❌ Form validation failed:", errors);
    console.log("All form errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check all required fields and try again.",
      variant: "destructive",
    });
  };

  if (submittedData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#1a1d29]">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-[#ff6b35]/20 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-[#ff6b35]" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-white">{successTitle}</h1>
              <p className="text-lg text-gray-400">
                {successMessage}
              </p>
            </div>
          </div>

          <Card className="bg-[#232835] border-[#2d3548]">
            <CardHeader>
              <CardTitle className="text-white">Registration Details</CardTitle>
              <CardDescription className="text-gray-400">Please save this information for your records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Registration ID</p>
                  <p className="font-medium font-mono text-white">{submittedData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="font-medium text-white">{submittedData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="font-medium text-white">{submittedData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Phone</p>
                  <p className="font-medium text-white">{submittedData.phone}</p>
                </div>
                {submittedData.organization && (
                  <div>
                    <p className="text-sm text-gray-400">Organization</p>
                    <p className="font-medium text-white">{submittedData.organization}</p>
                  </div>
                )}
                {submittedData.groupSize && (
                  <div>
                    <p className="text-sm text-gray-400">Group Size</p>
                    <p className="font-medium text-white">{submittedData.groupSize} {submittedData.groupSize === 1 ? 'person' : 'people'}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#2d3548] space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span>Your QR code entry pass will be generated by our admin team</span>
                </div>
                <p className="text-sm text-gray-400">
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
              className="bg-transparent border-[#ff6b35] text-[#ff6b35] hover:bg-[#ff6b35]/10"
              data-testid="button-new-registration"
            >
              Register Another Person
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Payment field from custom fields
  const paymentField = customFields.find(f => f.type === 'payment');

  return (
    <div className="min-h-screen bg-[#1a1d29] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #ff6b35 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      </div>

      {/* Admin Login Button - Top Right */}
      <div className="fixed top-4 right-4 z-20">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/admin'}
          className="bg-[#232835] border-[#2d3548] text-gray-300 hover:bg-[#2d3548] hover:text-white"
        >
          <Shield className="h-4 w-4 mr-2" />
          Admin Login
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          {logoUrl && (
            <div className="flex justify-center mb-6">
              <img src={logoUrl} alt="Logo" className="h-20 w-auto" />
            </div>
          )}
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="text-[#ff6b35]">{title.split(' ')[0]}</span>
            <span className="text-white"> {title.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-xl text-gray-400">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Payment Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Registration Fee Card */}
            <Card className="bg-gradient-to-br from-[#232835] to-[#1a1d29] border-2 border-[#ff6b35]/30">
              <CardHeader>
                <CardTitle className="text-[#ff6b35] text-lg">REGISTRATION FEE</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold text-white mb-4">
                  ₹{baseFields.teamMembers?.registrationFee || 99} <span className="text-xl text-gray-400">/ slot</span>
                </div>
                <p className="text-sm text-gray-400">
                  {baseFields.teamMembers?.registrationFeeDescription || "You are buying ONE slot. The fee is fixed at ₹99 whether you play Solo, Duo, Trio, or Full Squad."}
                </p>
              </CardContent>
            </Card>

            {/* How to Pay Card */}
            <Card className="bg-[#232835] border-[#2d3548]">
              <CardHeader>
                <CardTitle className="text-[#ff6b35] text-lg">HOW TO PAY</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-300">
                  <span className="text-white font-semibold">1.</span> Pay ₹{baseFields.teamMembers?.registrationFee || 99} to the UPI ID below.
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-white font-semibold">2.</span> Take a clear screenshot of the success screen.
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-white font-semibold">3.</span> Copy the Transaction ID.
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-white font-semibold">4.</span> Complete the form on the right.
                </div>
                <div className="mt-4 p-4 bg-[#1a1d29] rounded-lg border border-[#2d3548]">
                  <div className="text-xs text-gray-400 mb-1">OFFICIAL UPI ID</div>
                  <div className="text-[#ff6b35] font-mono text-sm font-semibold">
                    {paymentField?.paymentUrl?.replace('upi://', '').split('?')[0] || 'tournament@upi'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {watermarkUrl && (
              <div className="flex justify-center">
                <img src={watermarkUrl} alt="Event" className="h-48 w-auto object-contain opacity-50" />
              </div>
            )}
          </div>

          {/* Right Column - Registration Form */}
          <div className="lg:col-span-2">
            {/* Payment Button - Only show if payment field exists */}
            {paymentField && paymentField.paymentUrl && (
              <Card className="bg-gradient-to-r from-[#ff6b35] to-[#ff5722] border-0 mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-xl mb-2">Step 1: Complete Payment</h3>
                      <p className="text-white/90 text-sm">Pay ₹99 registration fee before filling the form</p>
                    </div>
                    <Button
                      onClick={() => window.open(paymentField.paymentUrl, '_blank')}
                      className="bg-white text-[#ff6b35] hover:bg-gray-100 font-bold px-8 py-6 text-lg"
                    >
                      <DollarSign className="h-5 w-5 mr-2" />
                      Proceed to Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#232835] border-[#2d3548]">
              <CardHeader>
                <CardTitle className="text-white text-2xl">
                  {paymentField ? 'TEAM REGISTRATION (Step 2)' : 'TEAM REGISTRATION'}
                </CardTitle>
                {paymentField && (
                  <CardDescription className="text-gray-400">
                    After completing payment, fill in your details and paste the transaction ID below
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit, handleSubmitError)} className="space-y-6">
                    {/* Squad Leader Section */}
                    <div className="space-y-4">
                      <h3 className="text-[#ff6b35] font-semibold text-lg">SQUAD LEADER (YOU)</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {baseFields.name?.enabled && (
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">
                                  {baseFields.name?.label}
                                  {baseFields.name?.required && <span className="text-[#ff6b35] ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={baseFields.name?.placeholder || "Enter your name"}
                                    {...field}
                                    className="bg-[#1a1d29] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                    data-testid="input-name"
                                  />
                                </FormControl>
                                <FormMessage className="text-[#ff6b35]" />
                              </FormItem>
                            )}
                          />
                        )}

                        {customFields.filter(f => f.type !== 'payment' && f.type !== 'photo').slice(0, 1).map((customField) => (
                          <FormField
                            key={customField.id}
                            control={form.control}
                            name={customField.id}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">
                                  {customField.label}
                                  {customField.required && <span className="text-[#ff6b35] ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={customField.placeholder || ""}
                                    {...field}
                                    value={field.value || ""}
                                    className="bg-[#1a1d29] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                    data-testid={`input-custom-${customField.id}`}
                                  />
                                </FormControl>
                                <FormMessage className="text-[#ff6b35]" />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {baseFields.phone?.enabled && (
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">
                                  {baseFields.phone?.label}
                                  {baseFields.phone?.required && <span className="text-[#ff6b35] ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="tel"
                                    placeholder={baseFields.phone?.placeholder || "10-digit mobile number"}
                                    {...field}
                                    className="bg-[#1a1d29] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                    data-testid="input-phone"
                                  />
                                </FormControl>
                                <FormMessage className="text-[#ff6b35]" />
                              </FormItem>
                            )}
                          />
                        )}

                        {baseFields.email?.enabled && (
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">
                                  {baseFields.email?.label}
                                  {baseFields.email?.required && <span className="text-[#ff6b35] ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder={baseFields.email?.placeholder || "valid@email.com"}
                                    {...field}
                                    className="bg-[#1a1d29] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                    data-testid="input-email"
                                  />
                                </FormControl>
                                <FormMessage className="text-[#ff6b35]" />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {baseFields.organization?.enabled && (
                        <FormField
                          control={form.control}
                          name="organization"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">
                                {baseFields.organization?.label}
                                {baseFields.organization?.required && <span className="text-[#ff6b35] ml-1">*</span>}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={baseFields.organization?.placeholder || "Enter organization name"}
                                  {...field}
                                  className="bg-[#1a1d29] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                  data-testid="input-organization"
                                />
                              </FormControl>
                              <FormMessage className="text-[#ff6b35]" />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Team Members Section */}
                    {teamMembersConfig.enabled && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[#ff6b35] font-semibold text-lg">
                            {teamMembersConfig.label.toUpperCase()}
                          </h3>
                          <span className="text-sm text-gray-400">(Required, Max {maxTeamMembers})</span>
                        </div>

                        <div className="p-4 bg-[#1a1d29] rounded-lg border border-[#2d3548]">
                          <Label className="text-gray-300 mb-2 block font-semibold">Select Your Squad Type</Label>
                          <Select value={selectedMemberCount.toString()} onValueChange={handleMemberCountChange}>
                            <SelectTrigger className="bg-[#232835] border-[#2d3548] text-white hover:border-[#ff6b35]">
                              <SelectValue placeholder="Select squad type" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#232835] border-[#2d3548]">
                              <SelectItem value="0" className="text-white hover:bg-[#1a1d29]">
                                🎯 Solo (No Team Members)
                              </SelectItem>
                              {Array.from({ length: maxTeamMembers }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()} className="text-white hover:bg-[#1a1d29]">
                                  {num === 1 ? '👥 Duo (1 Team Member)' : 
                                   num === 2 ? '👥👥 Trio (2 Team Members)' : 
                                   num === 3 ? '👥👥👥 Squad (3 Team Members)' : 
                                   `👥 ${num} Team Members`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedMemberCount === 0 && (
                            <p className="text-sm text-[#ff6b35] mt-2 font-medium">
                              ✓ Playing solo - no team member forms needed
                            </p>
                          )}
                        </div>

                        {selectedMemberCount > 0 && teamMemberFields.map((field, index) => {
                          const memberNameConfig = teamMembersConfig.memberNameConfig;
                          const memberEmailConfig = teamMembersConfig.memberEmailConfig;
                          const memberPhoneConfig = teamMembersConfig.memberPhoneConfig;

                          // Calculate grid columns based on enabled fields
                          const enabledFieldsCount = [
                            memberNameConfig?.enabled !== false,
                            memberEmailConfig?.enabled !== false,
                            memberPhoneConfig?.enabled !== false
                          ].filter(Boolean).length;

                          const gridColsClass = enabledFieldsCount === 1 ? 'grid-cols-1' :
                                               enabledFieldsCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
                                               'grid-cols-1 md:grid-cols-3';

                          return (
                            <div key={field.id} className="p-4 bg-[#1a1d29] rounded-lg border border-[#2d3548]">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-300">Member {index + 1}</h4>
                              </div>
                              <div className={`grid ${gridColsClass} gap-3`}>
                                {(memberNameConfig?.enabled !== false) && (
                                  <FormField
                                    control={form.control}
                                    name={`teamMembers.${index}.name`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-gray-400 text-sm">
                                          {teamMembersConfig.memberNameLabel || "Full Name"}
                                          {(memberNameConfig?.required !== false) && <span className="text-[#ff6b35] ml-1">*</span>}
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder={teamMembersConfig.memberNamePlaceholder || "Enter member name"}
                                            {...field}
                                            className="bg-[#232835] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                            data-testid={`input-member-${index}-name`}
                                          />
                                        </FormControl>
                                        <FormMessage className="text-[#ff6b35]" />
                                      </FormItem>
                                    )}
                                  />
                                )}

                                {(memberEmailConfig?.enabled !== false) && (
                                  <FormField
                                    control={form.control}
                                    name={`teamMembers.${index}.email`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-gray-400 text-sm">
                                          {teamMembersConfig.memberEmailLabel || "Email"}
                                          {(memberEmailConfig?.required !== false) && <span className="text-[#ff6b35] ml-1">*</span>}
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="email"
                                            placeholder={teamMembersConfig.memberEmailPlaceholder || "member@example.com"}
                                            {...field}
                                            className="bg-[#232835] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                            data-testid={`input-member-${index}-email`}
                                          />
                                        </FormControl>
                                        <FormMessage className="text-[#ff6b35]" />
                                      </FormItem>
                                    )}
                                  />
                                )}

                                {(memberPhoneConfig?.enabled !== false) && (
                                  <FormField
                                    control={form.control}
                                    name={`teamMembers.${index}.phone`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-gray-400 text-sm">
                                          {teamMembersConfig.memberPhoneLabel || "Phone Number"}
                                          {(memberPhoneConfig?.required !== false) && <span className="text-[#ff6b35] ml-1">*</span>}
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="tel"
                                            placeholder={teamMembersConfig.memberPhonePlaceholder || "+1 (555) 123-4567"}
                                            {...field}
                                            className="bg-[#232835] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                            data-testid={`input-member-${index}-phone`}
                                          />
                                        </FormControl>
                                        <FormMessage className="text-[#ff6b35]" />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>

                              {/* Custom team member fields */}
                              {teamMemberCustomFields.length > 0 && (
                                <div className="mt-3 space-y-3">
                                  {teamMemberCustomFields.map((customField) => (
                                    <FormField
                                      key={customField.id}
                                      control={form.control}
                                      name={`teamMembers.${index}.${customField.id}`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-gray-400 text-sm">
                                            {customField.label}
                                            {customField.required && <span className="text-[#ff6b35] ml-1">*</span>}
                                          </FormLabel>
                                          <FormControl>
                                            {customField.type === "textarea" ? (
                                              <Textarea
                                                placeholder={customField.placeholder || ""}
                                                {...field}
                                                className="bg-[#232835] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                                data-testid={`textarea-member-${index}-${customField.id}`}
                                              />
                                            ) : customField.type === "photo" ? (
                                              <div className="space-y-2">
                                                <Input
                                                  type="file"
                                                  accept="image/*"
                                                  onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                      setUploadingField(customField.id);
                                                      try {
                                                        const formData = new FormData();
                                                        formData.append("photo", file);
                                                        const response = await apiRequest("POST", "/api/upload-photo", formData);
                                                        const result = await response.json();
                                                        form.setValue(`teamMembers.${index}.${customField.id}`, result.photoUrl);
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
                                                    }
                                                  }}
                                                  className="bg-[#232835] border-[#2d3548] text-white file:bg-[#ff6b35] file:text-white file:border-0 file:px-4 file:py-2 file:rounded"
                                                  data-testid={`file-member-${index}-${customField.id}`}
                                                  disabled={uploadingField === customField.id}
                                                />
                                                {uploadingField === customField.id && (
                                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Uploading...</span>
                                                  </div>
                                                )}
                                                {field.value && (
                                                  <div className="mt-2">
                                                    <img
                                                      src={field.value}
                                                      alt="Preview"
                                                      className="max-w-[200px] rounded border border-[#2d3548]"
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <Input
                                                type={customField.type === "email" ? "email" : customField.type === "phone" ? "tel" : customField.type === "url" ? "url" : "text"}
                                                placeholder={customField.placeholder || ""}
                                                {...field}
                                                className="bg-[#232835] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                                data-testid={`input-member-${index}-${customField.id}`}
                                              />
                                            )}
                                          </FormControl>
                                          {customField.helpText && (
                                            <FormDescription className="text-gray-500">
                                              {customField.helpText}
                                            </FormDescription>
                                          )}
                                          <FormMessage className="text-[#ff6b35]" />
                                        </FormItem>
                                      )}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Payment Verification Section */}
                    {paymentField && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-[#ff6b35]" />
                          <h3 className="text-[#ff6b35] font-semibold text-lg">PAYMENT VERIFICATION</h3>
                        </div>

                        <FormField
                          control={form.control}
                          name={paymentField.id}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">
                                Transaction ID / UTR
                                {paymentField.required && <span className="text-[#ff6b35] ml-1">*</span>}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., 3245xxxxxxxxx"
                                  {...field}
                                  value={field.value || ""}
                                  className="bg-[#1a1d29] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35] font-mono"
                                  data-testid={`input-custom-${paymentField.id}`}
                                />
                              </FormControl>
                              <FormMessage className="text-[#ff6b35]" />
                            </FormItem>
                          )}
                        />

                        {customFields.filter(f => f.type === 'photo').map((customField) => (
                          <FormField
                            key={customField.id}
                            control={form.control}
                            name={customField.id}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-300">
                                  {customField.label}
                                  {customField.required && <span className="text-[#ff6b35] ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
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
                                      className="bg-[#1a1d29] border-[#2d3548] text-gray-300 file:bg-[#ff6b35] file:text-white file:border-0 file:px-4 file:py-2 file:rounded file:font-semibold"
                                      data-testid={`input-custom-${customField.id}`}
                                    />
                                    <p className="text-xs text-gray-500">* Max size 1MB. Clear image of success screen.</p>
                                    {uploadingField === customField.id && (
                                      <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Uploading...</span>
                                      </div>
                                    )}
                                    {field.value && (
                                      <div className="relative w-32 h-32 rounded-md overflow-hidden border border-[#2d3548]">
                                        <img src={field.value} alt="Uploaded" className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage className="text-[#ff6b35]" />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {/* Other Custom Fields */}
                    {customFields.filter(f => f.type !== 'payment' && f.type !== 'photo').slice(1).map((customField) => (
                      <FormField
                        key={customField.id}
                        control={form.control}
                        name={customField.id}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">
                              {customField.label}
                              {customField.required && <span className="text-[#ff6b35] ml-1">*</span>}
                            </FormLabel>
                            <FormControl>
                              {customField.type === "textarea" ? (
                                <Textarea
                                  placeholder={customField.placeholder || ""}
                                  {...field}
                                  rows={4}
                                  className="bg-[#1a1d29] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                  data-testid={`input-custom-${customField.id}`}
                                />
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
                                  className="bg-[#1a1d29] border-[#2d3548] text-white placeholder:text-gray-500 focus:border-[#ff6b35]"
                                  data-testid={`input-custom-${customField.id}`}
                                />
                              )}
                            </FormControl>
                            {customField.helpText && (
                              <FormDescription className="text-gray-500">
                                {customField.helpText}
                              </FormDescription>
                            )}
                            <FormMessage className="text-[#ff6b35]" />
                          </FormItem>
                        )}
                      />
                    ))}

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold bg-[#ff6b35] hover:bg-[#ff5722] text-white border-0"
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
          </div>
        </div>

        {/* Custom links */}
        {customLinks.length > 0 && (
          <div className="text-center mt-8 space-y-2">
            {customLinks.map((link: { label: string; url: string }, index: number) => (
              <div key={index}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm inline-flex items-center gap-2 text-[#ff6b35] hover:text-[#ff5722] transition-colors"
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
  );
}