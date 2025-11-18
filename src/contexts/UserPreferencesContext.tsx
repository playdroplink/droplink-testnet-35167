import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// User Preferences Types
export interface DashboardLayout {
  sidebarCollapsed: boolean;
  previewMode: 'phone' | 'tablet' | 'desktop';
  activeTab: string;
}

export interface StoreSettings {
  showFollowerCount: boolean;
  showVisitCount: boolean;
  enableComments: boolean;
  allowGifts: boolean;
  showSocialLinks: boolean;
}

export interface SocialSettings {
  allowFollows: boolean;
  showOnline: boolean;
  enableNotifications: boolean;
  allowMessages: boolean;
}

export interface ContentSettings {
  autoSave: boolean;
  draftsEnabled: boolean;
  backupEnabled: boolean;
  autoPublish: boolean;
}

export interface PrivacySettings {
  profileVisible: boolean;
  analyticsEnabled: boolean;
  dataCollection: boolean;
  showInSearch: boolean;
}

export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  marketing: boolean;
  follows: boolean;
  comments: boolean;
}

export interface UserPreferences {
  id?: string;
  user_id?: string;
  profile_id?: string;
  theme_mode: 'light' | 'dark' | 'system';
  primary_color: string;
  background_color: string;
  font_size: 'small' | 'medium' | 'large';
  dashboard_layout: DashboardLayout;
  store_settings: StoreSettings;
  social_settings: SocialSettings;
  content_settings: ContentSettings;
  privacy_settings: PrivacySettings;
  notification_settings: NotificationSettings;
  feature_flags: Record<string, boolean>;
  experiments: Record<string, any>;
  usage_data: Record<string, any>;
  custom_data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Default preferences
export const defaultPreferences: UserPreferences = {
  theme_mode: 'system',
  primary_color: '#3b82f6',
  background_color: '#000000',
  font_size: 'medium',
  dashboard_layout: {
    sidebarCollapsed: false,
    previewMode: 'phone',
    activeTab: 'profile'
  },
  store_settings: {
    showFollowerCount: true,
    showVisitCount: true,
    enableComments: true,
    allowGifts: true,
    showSocialLinks: true
  },
  social_settings: {
    allowFollows: true,
    showOnline: true,
    enableNotifications: true,
    allowMessages: true
  },
  content_settings: {
    autoSave: true,
    draftsEnabled: true,
    backupEnabled: true,
    autoPublish: false
  },
  privacy_settings: {
    profileVisible: true,
    analyticsEnabled: true,
    dataCollection: true,
    showInSearch: true
  },
  notification_settings: {
    email: true,
    browser: true,
    marketing: false,
    follows: true,
    comments: true
  },
  feature_flags: {},
  experiments: {},
  usage_data: {
    lastActive: null,
    totalSessions: 0,
    favoriteFeatures: []
  },
  custom_data: {}
};

// Context Type
interface UserPreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
  
  // Core preference methods
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  
  // Specific update methods
  updateTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  updateColors: (primary: string, background?: string) => Promise<void>;
  updateDashboardLayout: (layout: Partial<DashboardLayout>) => Promise<void>;
  updateStoreSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  updateSocialSettings: (settings: Partial<SocialSettings>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  
  // Feature flags and experiments
  updateFeatureFlag: (flag: string, enabled: boolean) => Promise<void>;
  getFeatureFlag: (flag: string, defaultValue?: boolean) => boolean;
  joinExperiment: (experiment: string, variant: string) => Promise<void>;
  getExperimentVariant: (experiment: string) => string | null;
  
  // Usage tracking
  trackFeatureUsage: (feature: string) => Promise<void>;
  updateLastActive: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load preferences from Supabase
  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('No authenticated user, using default preferences');
        setPreferences(defaultPreferences);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      
      // For now, just use default preferences since database table may not exist yet
      // TODO: Enable this once user_preferences table is created via migration
      console.log('Using default preferences (database integration pending migration)');
      setPreferences(defaultPreferences);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  // Create default preferences (for now in localStorage)
  const createDefaultPreferences = async (userId: string) => {
    try {
      // For now, just store in localStorage since database table may not exist yet
      localStorage.setItem(`user_preferences_${userId}`, JSON.stringify(defaultPreferences));
      console.log('✅ Created default preferences in localStorage');
      setPreferences(defaultPreferences);
    } catch (err) {
      console.error('Failed to create default preferences:', err);
    }
  };

  // Save preferences to Supabase
  const savePreferences = async (updatedPrefs: Partial<UserPreferences>) => {
    if (!currentUserId) return;

    try {
      // For now, just store in localStorage since database table may not exist yet
      // TODO: Enable database saving once user_preferences table is created via migration
      localStorage.setItem(`user_preferences_${currentUserId}`, JSON.stringify({
        ...preferences,
        ...updatedPrefs
      }));
      console.log('✅ Preferences saved to localStorage (database integration pending migration)');
    } catch (err) {
      console.error('Failed to save preferences:', err);
      toast.error('Failed to save preferences');
    }
  };

  // Update preferences (local and remote)
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const updatedPrefs = { ...preferences, ...updates };
    setPreferences(updatedPrefs);
    await savePreferences(updates);
  };

  // Reset to default preferences
  const resetPreferences = async () => {
    setPreferences(defaultPreferences);
    await savePreferences(defaultPreferences);
    toast.success('Preferences reset to defaults');
  };

  // Specific update methods
  const updateTheme = async (theme: 'light' | 'dark' | 'system') => {
    await updatePreferences({ theme_mode: theme });
  };

  const updateColors = async (primary: string, background?: string) => {
    const updates: any = { primary_color: primary };
    if (background) updates.background_color = background;
    await updatePreferences(updates);
  };

  const updateDashboardLayout = async (layout: Partial<DashboardLayout>) => {
    const updatedLayout = { ...preferences.dashboard_layout, ...layout };
    await updatePreferences({ dashboard_layout: updatedLayout });
  };

  const updateStoreSettings = async (settings: Partial<StoreSettings>) => {
    const updatedSettings = { ...preferences.store_settings, ...settings };
    await updatePreferences({ store_settings: updatedSettings });
  };

  const updateSocialSettings = async (settings: Partial<SocialSettings>) => {
    const updatedSettings = { ...preferences.social_settings, ...settings };
    await updatePreferences({ social_settings: updatedSettings });
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    const updatedSettings = { ...preferences.privacy_settings, ...settings };
    await updatePreferences({ privacy_settings: updatedSettings });
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...preferences.notification_settings, ...settings };
    await updatePreferences({ notification_settings: updatedSettings });
  };

  // Feature flags
  const updateFeatureFlag = async (flag: string, enabled: boolean) => {
    const updatedFlags = { ...preferences.feature_flags, [flag]: enabled };
    await updatePreferences({ feature_flags: updatedFlags });
  };

  const getFeatureFlag = (flag: string, defaultValue: boolean = false): boolean => {
    return preferences.feature_flags[flag] ?? defaultValue;
  };

  // Experiments
  const joinExperiment = async (experiment: string, variant: string) => {
    const updatedExperiments = { ...preferences.experiments, [experiment]: variant };
    await updatePreferences({ experiments: updatedExperiments });
  };

  const getExperimentVariant = (experiment: string): string | null => {
    return preferences.experiments[experiment] ?? null;
  };

  // Usage tracking
  const trackFeatureUsage = async (feature: string) => {
    const favoriteFeatures = preferences.usage_data.favoriteFeatures || [];
    const updatedFeatures = [...favoriteFeatures];
    
    if (!updatedFeatures.includes(feature)) {
      updatedFeatures.push(feature);
    }

    const updatedUsage = {
      ...preferences.usage_data,
      favoriteFeatures: updatedFeatures,
      lastActive: new Date().toISOString()
    };

    await updatePreferences({ usage_data: updatedUsage });
  };

  const updateLastActive = async () => {
    const updatedUsage = {
      ...preferences.usage_data,
      lastActive: new Date().toISOString(),
      totalSessions: (preferences.usage_data.totalSessions || 0) + 1
    };

    await updatePreferences({ usage_data: updatedUsage });
  };

  // Load preferences on mount and auth changes
  useEffect(() => {
    loadPreferences();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadPreferences();
      } else if (event === 'SIGNED_OUT') {
        setPreferences(defaultPreferences);
        setCurrentUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (preferences.theme_mode === 'dark') {
      root.classList.add('dark');
    } else if (preferences.theme_mode === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply custom colors
    root.style.setProperty('--primary', preferences.primary_color);
    root.style.setProperty('--background', preferences.background_color);
  }, [preferences.theme_mode, preferences.primary_color, preferences.background_color]);

  const value: UserPreferencesContextType = {
    preferences,
    loading,
    error,
    updatePreferences,
    resetPreferences,
    updateTheme,
    updateColors,
    updateDashboardLayout,
    updateStoreSettings,
    updateSocialSettings,
    updatePrivacySettings,
    updateNotificationSettings,
    updateFeatureFlag,
    getFeatureFlag,
    joinExperiment,
    getExperimentVariant,
    trackFeatureUsage,
    updateLastActive
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

// Hook to use user preferences
export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};