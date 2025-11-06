import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import RegistrationForm from "@/components/RegistrationForm";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";
import type { EventForm } from "@shared/schema";

function AdminRoute() {
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if admin is already logged in
    fetch("/api/admin/check", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        setIsLoggedIn(data.isAdmin || false);
        setIsChecking(false);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsChecking(false);
      });
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <AdminDashboard
        onLogout={() => {
          setIsLoggedIn(false);
          // Invalidate all queries on logout
          queryClient.clear();
        }}
      />
    );
  }

  return (
    <AdminLogin
      onLogin={() => {
        setIsLoggedIn(true);
      }}
    />
  );
}

function PublicFormView() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const { data: publishedForm, isLoading } = useQuery<EventForm | null>({
    queryKey: ["/api/published-form"],
  });

  useEffect(() => {
    // Check if user is admin
    fetch("/api/admin/check", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.isAdmin || false);
        setCheckingAdmin(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setCheckingAdmin(false);
      });
  }, []);

  if (isLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!publishedForm) {
    // No published form
    if (isAdmin) {
      // Show message to admin
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">No Published Form</h1>
              <p className="text-muted-foreground">
                There is currently no published registration form. Create and publish a form from the admin dashboard.
              </p>
            </div>
            <Button onClick={() => window.location.href = "/admin"} data-testid="button-go-to-admin">
              Go to Admin Dashboard
            </Button>
          </div>
        </div>
      );
    } else {
      // Show nothing to non-admin users
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold">No Active Registration</h1>
            <p className="text-muted-foreground">
              There is no registration form available at this time. Please check back later.
            </p>
          </div>
        </div>
      );
    }
  }

  return <RegistrationForm publishedForm={publishedForm} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PublicFormView />
      </Route>

      <Route path="/admin">
        <AdminRoute />
      </Route>

      <Route path="/verify">
        {/* Verification page - will show scan result */}
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold">QR Code Verification</h1>
            <p className="text-muted-foreground">
              This page is accessed by scanning QR codes at the event entrance.
            </p>
            <p className="text-sm text-muted-foreground">
              Admin staff will use the scanner in the admin dashboard to verify entries.
            </p>
          </div>
        </div>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
