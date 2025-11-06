import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import RegistrationForm from "@/components/RegistrationForm";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";
import heroImage from "@assets/generated_images/Event_venue_hero_image_9ef8bf32.png";

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

function Router() {
  return (
    <Switch>
      <Route path="/">
        <RegistrationForm heroImage={heroImage} />
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
