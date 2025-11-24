import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Sparkles, Upload, Image, Monitor, X, Settings, Sliders, Link } from "lucide-react";
import { useState } from "react";
import { PlanGate } from "@/components/PlanGate";
import ReadyThemeSelector from "./ReadyThemeSelector";
import AdvancedCustomizer from "./AdvancedCustomizer";
import LinkCustomizer from "./LinkCustomizer";

interface ThemeTemplate {
  id: string;
  name: string;
  primaryColor: string;
  backgroundColor: string;
  iconStyle: 'rounded' | 'circle' | 'square';
  description: string;
}

const themeTemplates: ThemeTemplate[] = [
  {
    id: 'ocean',
    name: 'Ocean Blue',
    primaryColor: '#3b82f6',
    backgroundColor: '#0f172a',
    iconStyle: 'rounded',
    description: 'Professional blue theme'
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    primaryColor: '#f97316',
    backgroundColor: '#1a1a1a',
    iconStyle: 'circle',
    description: 'Warm and inviting'
  },
  {
    id: 'forest',
    name: 'Forest Green',
    primaryColor: '#10b981',
    backgroundColor: '#111827',
    iconStyle: 'rounded',
    description: 'Natural and fresh'
  },
  {
    id: 'lavender',
    name: 'Lavender Dream',
    primaryColor: '#a855f7',
    backgroundColor: '#1e1b4b',
    iconStyle: 'circle',
    description: 'Creative and modern'
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    primaryColor: '#ec4899',
    backgroundColor: '#18181b',
    iconStyle: 'rounded',
    description: 'Elegant and stylish'
  },
  {
    id: 'midnight',
    name: 'Midnight',
    primaryColor: '#6366f1',
    backgroundColor: '#000000',
    iconStyle: 'square',
    description: 'Sleek and minimal'
  },
];

interface DesignCustomizerProps {
  theme: {
    primaryColor: string;
    backgroundColor: string;
    backgroundType: 'color' | 'gif' | 'video';
    backgroundGif: string;
    iconStyle: string;
    buttonStyle: string;
  };
  onThemeChange: (theme: { primaryColor: string; backgroundColor: string; backgroundType: 'color' | 'gif' | 'video'; backgroundGif: string; iconStyle: string; buttonStyle: string }) => void;
}

export const DesignCustomizer = ({ theme, onThemeChange }: DesignCustomizerProps) => {
  const [uploadingGif, setUploadingGif] = useState(false);
  const [customizationMode, setCustomizationMode] = useState<'simple' | 'advanced'>('simple');
  const [showLinkCustomizer, setShowLinkCustomizer] = useState(false);
  const [customLinks, setCustomLinks] = useState<any[]>([]);
  // Use a type that matches CustomizationSettings, or cast as needed
  const [advancedSettings, setAdvancedSettings] = useState<any>({
    header: {
      layout: 'centered', // allow any valid layout string
      showProfileImage: true,
      showBio: true,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      backgroundImage: ''
    },
    wallpaper: {
      type: 'color',
      value: theme.backgroundColor,
      opacity: 100,
      blur: 0,
      overlay: 'rgba(0,0,0,0)'
    },
    text: {
      fontFamily: 'Inter',
      titleSize: 24,
      bodySize: 16,
      color: '#1f2937',
      alignment: 'center',
      titleWeight: 600,
      bodyWeight: 400
    },
    buttons: {
      style: 'filled',
      roundness: 8,
      spacing: 16,
      animation: 'hover-lift',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      shadow: true
    },
    colors: {
      primary: theme.primaryColor,
      secondary: '#6b7280',
      accent: '#8b5cf6',
      background: theme.backgroundColor,
      surface: '#ffffff',
      text: '#1f2937',
      muted: '#6b7280'
    },
    presets: {
      name: 'Custom',
      category: 'modern'
    }
  });

  const handleTemplateSelect = (template: ThemeTemplate) => {
    onThemeChange({
      primaryColor: template.primaryColor,
      backgroundColor: template.backgroundColor,
      backgroundType: theme.backgroundType, // Preserve current background type
      backgroundGif: theme.backgroundGif, // Preserve current GIF
      iconStyle: template.iconStyle,
      buttonStyle: theme.buttonStyle, // Preserve existing button style
    });
  };

  const handleGifUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('gif')) {
      alert('Please select a GIF file only.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB. Please compress your GIF and try again.');
      return;
    }

    setUploadingGif(true);

    try {
      // Convert file to base64 data URL for immediate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Validate the data URL format
          if (!result.startsWith('data:image/gif;base64,')) {
            alert('Invalid GIF file format. Please select a valid GIF file.');
            return;
          }
          
          // Update theme with the data URL
          onThemeChange({ 
            ...theme, 
            backgroundGif: result,
            backgroundType: 'gif'
          });
          
          // Log successful upload for debugging
          console.log(`GIF uploaded successfully, data URL length: ${result.length} characters`);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading GIF:', error);
      alert('Failed to upload GIF. Please try again.');
    } finally {
      setUploadingGif(false);
      // Clear the input
      event.target.value = '';
    }
  };

  return (
    <PlanGate minPlan="premium">
      <div className="space-y-6">
      {/* Customization Mode Selector (Premium/Pro only) */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Design Customization</h3>
          </div>
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setCustomizationMode('simple')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                customizationMode === 'simple'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Simple
            </button>
            <button
              onClick={() => setCustomizationMode('advanced')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                customizationMode === 'advanced'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              Advanced
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {customizationMode === 'simple' 
            ? 'Choose from ready-made themes and basic customization options'
            : 'Full control over every aspect of your design with advanced settings'
          }
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowLinkCustomizer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Link className="w-4 h-4" />
            Customize Link Metadata
          </button>
          <p className="text-xs text-gray-500 mt-1">Add favicons, descriptions, and custom styling to your links</p>
        </div>
      </div>

      {/* Render based on mode (Premium/Pro only) */}
      {customizationMode === 'simple' ? (
        <div className="space-y-6">
          {/* Ready-to-Use Themes Section */}
          <ReadyThemeSelector 
            currentTheme={theme}
            onThemeSelect={(selectedTheme) => onThemeChange({ ...theme, ...selectedTheme })}
          />

          {/* Divider */}
          <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Template Themes</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Quick template options to get you started
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themeTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className={`relative p-4 rounded-lg border-2 transition-all hover:scale-[1.02] text-left ${
                theme.primaryColor === template.primaryColor &&
                theme.backgroundColor === template.backgroundColor
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: template.primaryColor }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: template.backgroundColor }}
                    />
                    <div
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: template.primaryColor }}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {template.iconStyle}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Custom Colors</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="primary-color"
                type="color"
                value={theme.primaryColor}
                onChange={(e) => onThemeChange({ ...theme, primaryColor: e.target.value })}
                className="w-14 h-10 rounded border border-input cursor-pointer"
              />
              <input
                type="text"
                value={theme.primaryColor}
                onChange={(e) => onThemeChange({ ...theme, primaryColor: e.target.value })}
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bg-color">Background Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="bg-color"
                type="color"
                value={theme.backgroundColor}
                onChange={(e) => onThemeChange({ ...theme, backgroundColor: e.target.value })}
                className="w-14 h-10 rounded border border-input cursor-pointer"
              />
              <input
                type="text"
                value={theme.backgroundColor}
                onChange={(e) => onThemeChange({ ...theme, backgroundColor: e.target.value })}
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
              />
            </div>
          </div>

          {/* Background Type Selection */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Background Style</Label>
            </div>
            <RadioGroup
              value={theme.backgroundType}
              onValueChange={(value: 'color' | 'gif') => onThemeChange({ ...theme, backgroundType: value })}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="color" id="bg-color-type" />
                <Label htmlFor="bg-color-type" className="font-normal cursor-pointer">
                  Solid Color
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gif" id="bg-gif-type" />
                <Label htmlFor="bg-gif-type" className="font-normal cursor-pointer">
                  GIF Background
                </Label>
              </div>
            </RadioGroup>

            {/* GIF Background Upload */}
            {theme.backgroundType === 'gif' && (
              <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">
                    GIF Background
                  </Label>
                </div>
                
                {/* Upload Section */}
                <div className="space-y-3 border rounded-lg p-3 bg-background/50">
                  <Label className="text-sm font-medium text-primary">Upload Your Own GIF</Label>
                  <div className="flex gap-2">
                    <label htmlFor="gif-file-upload" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 cursor-pointer"
                        disabled={uploadingGif}
                        asChild
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          {uploadingGif ? "Uploading..." : "Choose GIF File"}
                        </div>
                      </Button>
                      <input
                        id="gif-file-upload"
                        type="file"
                        accept=".gif,image/gif"
                        onChange={handleGifUpload}
                        className="hidden"
                      />
                    </label>
                    {theme.backgroundGif && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onThemeChange({ ...theme, backgroundGif: "" })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max file size: 10MB • Recommended: 1080x1920px
                  </p>
                </div>

                <div className="text-center text-xs text-muted-foreground">— OR —</div>
                
                {/* URL Input Section */}
                <div className="space-y-2">
                  <Label htmlFor="gif-url" className="text-sm text-muted-foreground">
                    Enter GIF URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="gif-url"
                      type="url"
                      value={theme.backgroundGif?.startsWith('data:') ? '' : theme.backgroundGif || ''}
                      onChange={(e) => onThemeChange({ ...theme, backgroundGif: e.target.value })}
                      placeholder="https://example.com/background.gif"
                      className="flex-1"
                    />
                    {theme.backgroundGif && !theme.backgroundGif.startsWith('data:') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onThemeChange({ ...theme, backgroundGif: "" })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sample GIFs */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sample Backgrounds</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: "Gradient Flow", url: "https://i.giphy.com/26BRrSvJUa0crqw4E.gif" },
                      { name: "Abstract Waves", url: "https://i.giphy.com/l0HlDDyxBfSaPpU88.gif" },
                      { name: "Cosmic", url: "https://i.giphy.com/l0HlGrpCUrKNhN1ZK.gif" }
                    ].map((sample) => (
                      <Button
                        key={sample.name}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 px-2"
                        onClick={() => onThemeChange({ ...theme, backgroundGif: sample.url })}
                      >
                        {sample.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* GIF Preview */}
                {theme.backgroundGif && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Preview</Label>
                      <span className="text-xs text-muted-foreground">
                        {theme.backgroundGif.startsWith('data:') ? '📁 Uploaded File' : '🔗 URL'}
                      </span>
                    </div>
                    <div className="relative w-full h-32 border rounded-lg overflow-hidden bg-black">
                      <img
                        src={theme.backgroundGif}
                        alt="Background GIF Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('GIF preview failed to load:', theme.backgroundGif?.substring(0, 100) + '...');
                          e.currentTarget.style.display = 'none';
                          const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                          errorDiv?.classList.remove('hidden');
                        }}
                        onLoad={() => {
                          console.log('GIF preview loaded successfully');
                        }}
                      />
                      <div className="hidden absolute inset-0 flex items-center justify-center text-muted-foreground text-sm bg-gray-100">
                        Failed to load GIF
                      </div>
                    </div>
                  </div>
                )}

                {/* Tips */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Tips:</strong></p>
                  <ul className="space-y-0.5 ml-2">
                    <li>• Upload your own GIF files directly (max 10MB)</li>
                    <li>• Or use GIF URLs from Giphy, Tenor, etc.</li>
                    <li>• Recommended size: 1080x1920 (vertical) or larger</li>
                    <li>• Smaller file sizes load faster on mobile devices</li>
                    <li>• Use tools like EZGIF.com to compress large files</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Icon Style</Label>
            <RadioGroup
              value={theme.iconStyle}
              onValueChange={(value) => onThemeChange({ ...theme, iconStyle: value })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rounded" id="rounded" />
                <Label htmlFor="rounded" className="font-normal cursor-pointer">
                  Rounded
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="circle" id="circle" />
                <Label htmlFor="circle" className="font-normal cursor-pointer">
                  Circle
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="square" id="square" />
                <Label htmlFor="square" className="font-normal cursor-pointer">
                  Square
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Button Style</Label>
            <RadioGroup
              value={theme.buttonStyle}
              onValueChange={(value) => onThemeChange({ ...theme, buttonStyle: value })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filled" id="filled" />
                <Label htmlFor="filled" className="font-normal cursor-pointer">
                  Filled
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outlined" id="outlined" />
                <Label htmlFor="outlined" className="font-normal cursor-pointer">
                  Outlined
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minimal" id="minimal" />
                <Label htmlFor="minimal" className="font-normal cursor-pointer">
                  Minimal
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
        </div>
      ) : (
        <AdvancedCustomizer 
          currentSettings={advancedSettings}
          onSettingsChange={(settings) => {
            setAdvancedSettings(settings);
            // Also update the basic theme state to keep compatibility
            onThemeChange({
              ...theme,
              primaryColor: settings.colors.primary,
              backgroundColor: settings.colors.background,
            });
          }}
        />
      )}
      
      {/* Link Customizer Modal (Premium/Pro only) */}
      {showLinkCustomizer && (
        <LinkCustomizer
          links={customLinks}
          onLinksChange={setCustomLinks}
          onClose={() => setShowLinkCustomizer(false)}
        />
      )}
    </div>
    </PlanGate>
  );
};
