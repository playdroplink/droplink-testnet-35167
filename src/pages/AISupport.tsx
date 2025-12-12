import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";
import { useActiveSubscription } from "@/hooks/useActiveSubscription";
import { PlanGate } from "@/components/PlanGate";
import { usePi } from "@/contexts/PiContext";

const STORAGE_KEY = 'droplink_ai_config';

const AISupport = () => {
  const navigate = useNavigate();
  const { piUser, isAuthenticated } = usePi();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    enabled: false,
    business_info: "",
    faqs: "",
    custom_instructions: "",
  });

  useEffect(() => {
    loadProfile();
  }, [piUser]);

  const loadProfile = async () => {
    try {
      if (!piUser?.username) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", piUser.username)
        .maybeSingle();

      if (profile) {
        setProfileId(profile.id);
        loadAIConfig(profile.id);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const loadAIConfig = (id: string) => {
    try {
      // Load from localStorage
      const stored = localStorage.getItem(`${STORAGE_KEY}_${id}`);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading AI config:", error);
    }
  };

  const handleSave = async () => {
    if (!profileId) return;

    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem(`${STORAGE_KEY}_${profileId}`, JSON.stringify(config));
      toast.success("AI Support settings saved!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save settings");
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
    <PlanGate minPlan="pro" featureName="AI Support">
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AI Support Configuration</h1>
          </div>

          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enabled" className="text-lg font-medium">
                  Enable AI Support
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow visitors to chat with your AI assistant
                </p>
              </div>
              <Switch
                id="enabled"
                checked={config.enabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_info">Business Information</Label>
              <Textarea
                id="business_info"
                placeholder="Describe your business, services, and what you offer..."
                value={config.business_info}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, business_info: e.target.value }))
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faqs">Frequently Asked Questions</Label>
              <Textarea
                id="faqs"
                placeholder="Add common questions and answers for your AI to reference..."
                value={config.faqs}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, faqs: e.target.value }))
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_instructions">Custom Instructions</Label>
              <Textarea
                id="custom_instructions"
                placeholder="Add specific instructions for how your AI should respond..."
                value={config.custom_instructions}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    custom_instructions: e.target.value,
                  }))
                }
                rows={4}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </Card>
        </div>
      </div>
    </PlanGate>
  );
};

export default AISupport;
