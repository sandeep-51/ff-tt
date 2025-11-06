import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Shield, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const registrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  organization: z.string().min(2, "Organization must be at least 2 characters"),
  groupSize: z.enum(["1", "2", "3", "4"], {
    required_error: "Please select group size",
  }),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  heroImage?: string;
}

export default function RegistrationForm({ heroImage = "/freefire-bg.jpg" }: RegistrationFormProps) {
  const { toast } = useToast();
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      organization: "",
      groupSize: "1",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await apiRequest("POST", "/api/register", {
        ...data,
        groupSize: parseInt(data.groupSize),
      });
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

  const handleSubmit = (data: RegistrationFormData) => {
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
              <h1 className="text-4xl font-bold">Registration Successful!</h1>
              <p className="text-lg text-muted-foreground">
                Thank you for registering. We've received your information.
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
      <div className="fixed inset-0 z-0">
        <img
          src={heroImage}
          alt="Free Fire Tournament"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content overlay */}
      <div className="relative z-10">
        <div className="relative py-12">
          <div className="text-center space-y-4 px-6 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">Event Registration</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
              Register now to receive your secure QR-based entry pass
            </p>
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
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          {...field}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Corporation"
                          {...field}
                          data-testid="input-organization"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="groupSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Size (Maximum 4 people) *</FormLabel>
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

        {/* Admin panel link */}
        <div className="text-center mt-6">
          <a 
            href="/admin" 
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Admin Access
          </a>
        </div>
        </div>
      </div>
    </div>
  );
}