import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Sparkles, Upload, Image, Monitor } from "lucide-react";

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
    backgroundType: 'color' | 'gif';
    backgroundGif: string;
    iconStyle: string;
    buttonStyle: string;
  };
  onThemeChange: (theme: { primaryColor: string; backgroundColor: string; backgroundType: 'color' | 'gif'; backgroundGif: string; iconStyle: string; buttonStyle: string }) => void;
}

export const DesignCustomizer = ({ theme, onThemeChange }: DesignCustomizerProps) => {
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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Ready-Made Templates</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Choose a pre-designed theme to quickly style your profile
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="gif-upload" className="text-sm font-medium">
                    GIF Background
                  </Label>
                </div>
                
                {/* GIF URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="gif-url" className="text-xs text-muted-foreground">
                    Enter GIF URL or choose from samples
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="gif-url"
                      type="url"
                      value={theme.backgroundGif}
                      onChange={(e) => onThemeChange({ ...theme, backgroundGif: e.target.value })}
                      placeholder="https://example.com/background.gif"
                      className="flex-1"
                    />
                    {theme.backgroundGif && (
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
                    <Label className="text-xs text-muted-foreground">Preview</Label>
                    <div className="relative w-full h-32 border rounded-lg overflow-hidden bg-black">
                      <img
                        src={theme.backgroundGif}
                        alt="Background GIF Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('GIF preview failed to load:', theme.backgroundGif);
                          e.currentTarget.style.display = 'none';
                          const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                          errorDiv?.classList.remove('hidden');
                        }}
                        onLoad={() => {
                          console.log('GIF preview loaded successfully:', theme.backgroundGif);
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
                    <li>• Use high-quality GIFs for best results</li>
                    <li>• Recommended size: 1080x1920 (vertical) or larger</li>
                    <li>• Keep file size under 5MB for better performance</li>
                    <li>• Ensure the GIF URL is publicly accessible</li>
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
  );
};
