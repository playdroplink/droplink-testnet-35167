import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Globe, Check, X, AlertCircle, ExternalLink, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePi } from "@/contexts/PiContext";
import { toast } from "sonner";
import { useActiveSubscription } from "@/hooks/useActiveSubscription";
import { PlanGate } from "@/components/PlanGate";

const CustomDomain = () => {
  const navigate = useNavigate();
  const { piUser, isAuthenticated } = usePi();
  const { plan } = useActiveSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "failed" | null>(null);

  useEffect(() => {
    loadDomainSettings();
  }, []);

  const loadDomainSettings = async () => {
    try {
      if (!isAuthenticated || !piUser) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, custom_domain")
        .eq("username", piUser.username)
        .maybeSingle();

      if (profile) {
        setProfileId(profile.id);
        setCurrentDomain((profile as any).custom_domain || null);
        setDomain((profile as any).custom_domain || "");
      }
    } catch (error) {
      console.error("Error loading domain settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain.trim())) {
      toast.error("Please enter a valid domain (e.g., example.com)");
      return;
    }

    setSaving(true);
    try {
      if (!profileId) {
        toast.error("Profile not found");
        return;
      }

      // Save domain to profile
      const { error } = await supabase
        .from("profiles")
        .update({
          custom_domain: domain.trim(),
        })
        .eq("id", profileId);

      if (error) throw error;

      setCurrentDomain(domain.trim());
      toast.success("Domain saved! Please configure DNS settings below.");
      setVerificationStatus("pending");
    } catch (error: any) {
      console.error("Error saving domain:", error);
      toast.error(error.message || "Failed to save domain");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDomain = async () => {
    setSaving(true);
    try {
      if (!profileId) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          custom_domain: null,
        })
        .eq("id", profileId);

      if (error) throw error;

      setCurrentDomain(null);
      setDomain("");
      setVerificationStatus(null);
      toast.success("Domain removed");
    } catch (error: any) {
      console.error("Error removing domain:", error);
      toast.error("Failed to remove domain");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Custom Domain</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        <PlanGate minPlan="premium">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Connect Your Domain
              </CardTitle>
              <CardDescription>
                Connect your custom domain (e.g., from GoDaddy, Hostinger, etc.) to your Droplink profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Domain Input */}
              <div className="space-y-2">
                <Label htmlFor="domain">Custom Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="example.com"
                    className="flex-1"
                    disabled={saving}
                  />
                  <Button 
                    onClick={handleSaveDomain} 
                    disabled={saving || !domain.trim()}
                    variant="default"
                    size="default"
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  {currentDomain && (
                    <Button 
                      variant="outline" 
                      onClick={handleRemoveDomain} 
                      disabled={saving}
                      size="default"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your domain without http:// or https:// (e.g., example.com)
                </p>
              </div>

              {/* Current Domain Status */}
              {currentDomain && (
                <Alert>
                  <Globe className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Current domain:</strong> {currentDomain}
                    {verificationStatus === "pending" && (
                      <span className="ml-2 text-yellow-600">(Verification pending)</span>
                    )}
                    {verificationStatus === "verified" && (
                      <span className="ml-2 text-green-600">(Verified)</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* DNS Configuration Instructions */}
              {currentDomain && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    DNS Configuration Instructions
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">For GoDaddy, Hostinger, Namecheap, etc.:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                        <li>Log in to your domain registrar</li>
                        <li>Go to DNS Management / DNS Settings</li>
                        <li>Add a CNAME record:</li>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li><strong>Type:</strong> CNAME</li>
                          <li><strong>Name/Host:</strong> @ or your subdomain (e.g., www)</li>
                          <li><strong>Value/Target:</strong> droplink-mainnet.lovable.app</li>
                          <li><strong>TTL:</strong> 3600 (or default)</li>
                        </ul>
                        <li>Save the DNS record</li>
                        <li>Wait 24-48 hours for DNS propagation</li>
                      </ol>
                    </div>
                    <div className="mt-4 p-3 bg-background rounded border">
                      <p className="font-medium mb-2">Example CNAME Record:</p>
                      <code className="text-xs block">
                        @ CNAME droplink-mainnet.lovable.app
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        Or for subdomain: www CNAME droplink-mainnet.lovable.app
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* .pi Domain Coming Soon */}
              <Alert className="border-primary/50 bg-primary/5">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong>.pi Domain Support Coming Soon!</strong>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    We're working on native .pi domain support. Stay tuned for updates!
                  </span>
                </AlertDescription>
              </Alert>

              {/* Help Section */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you're having trouble connecting your domain, check your registrar's documentation or contact support.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="default" asChild>
                    <a href="/ai-support" target="_blank" rel="noopener noreferrer">
                      <Info className="w-4 h-4 mr-2" />
                      Get Help
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </PlanGate>
      </div>
    </div>
  );
};

export default CustomDomain;

