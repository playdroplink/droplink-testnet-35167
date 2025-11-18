import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { toast } from "sonner";
import { 
  Palette, 
  Layout, 
  Store, 
  Users, 
  Shield, 
  Bell, 
  Zap, 
  RefreshCw,
  Monitor,
  Moon,
  Sun,
  Settings,
  Smartphone
} from "lucide-react";

export const UserPreferencesManager = () => {
  const {
    preferences,
    loading,
    updateTheme,
    updateColors,
    updateDashboardLayout,
    updateStoreSettings,
    updateSocialSettings,
    updatePrivacySettings,
    updateNotificationSettings,
    resetPreferences,
    trackFeatureUsage
  } = useUserPreferences();

  const [customColor, setCustomColor] = useState(preferences.primary_color);

  const handleColorChange = async () => {
    await updateColors(customColor);
    await trackFeatureUsage('theme_customization');
    toast.success('Theme colors updated!');
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await updateTheme(theme);
    await trackFeatureUsage('theme_switch');
    toast.success(`Switched to ${theme} theme`);
  };

  const handleReset = async () => {
    await resetPreferences();
    setCustomColor('#3b82f6');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Preferences...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            User Preferences
          </h2>
          <p className="text-muted-foreground">
            Customize your DropLink experience. Changes are saved automatically.
          </p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset All
        </Button>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="layout">
            <Layout className="w-4 h-4 mr-2" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="store">
            <Store className="w-4 h-4 mr-2" />
            Store
          </TabsTrigger>
          <TabsTrigger value="social">
            <Users className="w-4 h-4 mr-2" />
            Social
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="w-4 h-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Theme</CardTitle>
              <CardDescription>
                Customize the visual appearance of your DropLink dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={preferences.theme_mode === 'light' ? 'default' : 'outline'}
                    onClick={() => handleThemeChange('light')}
                    className="flex-1"
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={preferences.theme_mode === 'dark' ? 'default' : 'outline'}
                    onClick={() => handleThemeChange('dark')}
                    className="flex-1"
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={preferences.theme_mode === 'system' ? 'default' : 'outline'}
                    onClick={() => handleThemeChange('system')}
                    className="flex-1"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                  <Button onClick={handleColorChange}>Apply</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select
                  value={preferences.font_size}
                  onValueChange={(value: 'small' | 'medium' | 'large') => 
                    updatePreferences({ font_size: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Settings */}
        <TabsContent value="layout">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Layout</CardTitle>
              <CardDescription>
                Configure how your dashboard is organized and displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Collapsed Sidebar</Label>
                  <p className="text-sm text-muted-foreground">
                    Start with sidebar collapsed for more space
                  </p>
                </div>
                <Switch
                  checked={preferences.dashboard_layout.sidebarCollapsed}
                  onCheckedChange={(checked) =>
                    updateDashboardLayout({ sidebarCollapsed: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Default Preview Mode</Label>
                <Select
                  value={preferences.dashboard_layout.previewMode}
                  onValueChange={(value: 'phone' | 'tablet' | 'desktop') =>
                    updateDashboardLayout({ previewMode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Phone
                    </SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Active Tab</Label>
                <Select
                  value={preferences.dashboard_layout.activeTab}
                  onValueChange={(value) =>
                    updateDashboardLayout({ activeTab: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profile">Profile</SelectItem>
                    <SelectItem value="links">Links</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="settings">Settings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store & Bio Settings</CardTitle>
              <CardDescription>
                Configure what information is displayed on your public bio page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Follower Count</Label>
                  <p className="text-sm text-muted-foreground">
                    Display follower count on your bio
                  </p>
                </div>
                <Switch
                  checked={preferences.store_settings.showFollowerCount}
                  onCheckedChange={(checked) =>
                    updateStoreSettings({ showFollowerCount: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Visit Count</Label>
                  <p className="text-sm text-muted-foreground">
                    Display total visit count
                  </p>
                </div>
                <Switch
                  checked={preferences.store_settings.showVisitCount}
                  onCheckedChange={(checked) =>
                    updateStoreSettings({ showVisitCount: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Comments</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow visitors to leave comments
                  </p>
                </div>
                <Switch
                  checked={preferences.store_settings.enableComments}
                  onCheckedChange={(checked) =>
                    updateStoreSettings({ enableComments: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Gifts</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable Pi Network gifts from visitors
                  </p>
                </div>
                <Switch
                  checked={preferences.store_settings.allowGifts}
                  onCheckedChange={(checked) =>
                    updateStoreSettings({ allowGifts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Social Links</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your social media links
                  </p>
                </div>
                <Switch
                  checked={preferences.store_settings.showSocialLinks}
                  onCheckedChange={(checked) =>
                    updateStoreSettings({ showSocialLinks: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Settings */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social & Community</CardTitle>
              <CardDescription>
                Manage your social interactions and community features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Follows</Label>
                  <p className="text-sm text-muted-foreground">
                    Let other users follow your profile
                  </p>
                </div>
                <Switch
                  checked={preferences.social_settings.allowFollows}
                  onCheckedChange={(checked) =>
                    updateSocialSettings({ allowFollows: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Online Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Display when you're active
                  </p>
                </div>
                <Switch
                  checked={preferences.social_settings.showOnline}
                  onCheckedChange={(checked) =>
                    updateSocialSettings({ showOnline: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive social activity notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.social_settings.enableNotifications}
                  onCheckedChange={(checked) =>
                    updateSocialSettings({ enableNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Let other users send you messages
                  </p>
                </div>
                <Switch
                  checked={preferences.social_settings.allowMessages}
                  onCheckedChange={(checked) =>
                    updateSocialSettings({ allowMessages: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data</CardTitle>
              <CardDescription>
                Control your privacy settings and data collection preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Profile Visible</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to the public
                  </p>
                </div>
                <Switch
                  checked={preferences.privacy_settings.profileVisible}
                  onCheckedChange={(checked) =>
                    updatePrivacySettings({ profileVisible: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Analytics Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Collect analytics data for insights
                  </p>
                </div>
                <Switch
                  checked={preferences.privacy_settings.analyticsEnabled}
                  onCheckedChange={(checked) =>
                    updatePrivacySettings({ analyticsEnabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Collection</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow usage data collection for improvements
                  </p>
                </div>
                <Switch
                  checked={preferences.privacy_settings.dataCollection}
                  onCheckedChange={(checked) =>
                    updatePrivacySettings({ dataCollection: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show in Search</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow your profile to appear in search results
                  </p>
                </div>
                <Switch
                  checked={preferences.privacy_settings.showInSearch}
                  onCheckedChange={(checked) =>
                    updatePrivacySettings({ showInSearch: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={preferences.notification_settings.email}
                  onCheckedChange={(checked) =>
                    updateNotificationSettings({ email: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show browser push notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.notification_settings.browser}
                  onCheckedChange={(checked) =>
                    updateNotificationSettings({ browser: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about new features
                  </p>
                </div>
                <Switch
                  checked={preferences.notification_settings.marketing}
                  onCheckedChange={(checked) =>
                    updateNotificationSettings({ marketing: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>New Followers</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone follows you
                  </p>
                </div>
                <Switch
                  checked={preferences.notification_settings.follows}
                  onCheckedChange={(checked) =>
                    updateNotificationSettings({ follows: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Comments</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new comments
                  </p>
                </div>
                <Switch
                  checked={preferences.notification_settings.comments}
                  onCheckedChange={(checked) =>
                    updateNotificationSettings({ comments: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4" />
            All changes are saved automatically to your account and will persist across devices and app updates.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};