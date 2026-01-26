import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

// User Preferences Types - stored in localStorage only
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
  showCommunitySection: boolean;
  showMessageForm: boolean;
  showPiAds: boolean;
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
  theme_mode: 'light';
  primary_color: string;
  background_color: string;
  font_size: 'small' | 'medium' | 'large';
  dashboard_layout: DashboardLayout;
  store_settings: StoreSettings;
  social_settings: SocialSettings;
  content_settings: ContentSettings;
  privacy_settings: PrivacySettings;
  notification_settings: NotificationSettings;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  theme_mode: 'light',
  primary_color: '#8B5CF6',
  background_color: '#ffffff',
  font_size: 'medium',
  dashboard_layout: {
    sidebarCollapsed: false,
    previewMode: 'phone',
    activeTab: 'links'
  },
  store_settings: {
    showFollowerCount: true,
    showVisitCount: true,
    enableComments: false,
    allowGifts: true,
    showSocialLinks: true,
    showCommunitySection: true,
    showMessageForm: true,
    showPiAds: true
  },
  social_settings: {
    allowFollows: true,
    showOnline: true,
    enableNotifications: true,
    allowMessages: false
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
    dataCollection: false,
    showInSearch: true
  },
  notification_settings: {
    email: true,
    browser: true,
    marketing: false,
    follows: true,
    comments: true
  }
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  updateNestedPreference: <K extends keyof UserPreferences, NK extends keyof UserPreferences[K]>(
    key: K, 
    nestedKey: NK, 
    value: UserPreferences[K][NK]
  ) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  trackFeatureUsage: (featureName: string) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'droplink_user_preferences';

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (!loading) {
      savePreferences();
    }
  }, [preferences, loading]);

  // Apply theme to HTML element - LIGHT MODE ONLY
  useEffect(() => {
    const root = document.documentElement;
    // Always apply light mode, disable dark mode completely
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);

  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
        console.log('✅ User preferences loaded from localStorage');
      } else {
        setPreferences(defaultPreferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const updatePreference = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    console.log(`Updated preference: ${String(key)}`);
  };

  const updateNestedPreference = async <K extends keyof UserPreferences, NK extends keyof UserPreferences[K]>(
    key: K, 
    nestedKey: NK, 
    value: UserPreferences[K][NK]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] as any),
        [nestedKey]: value
      }
    }));
    console.log(`Updated nested preference: ${String(key)}.${String(nestedKey)}`);
  };

  const resetToDefaults = async () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Preferences reset to defaults');
  };

  const trackFeatureUsage = (featureName: string) => {
    console.log(`Feature used: ${featureName}`);
  };

  return (
    <UserPreferencesContext.Provider value={{
      preferences,
      loading,
      updatePreference,
      updateNestedPreference,
      resetToDefaults,
      trackFeatureUsage
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

export { defaultPreferences };
