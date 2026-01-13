import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface ThemeToggleProps {
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export const ThemeToggle = ({ 
  variant = "ghost", 
  size = "icon", 
  className = "",
  showText = false 
}: ThemeToggleProps) => {
  // Always ensure light mode is applied
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes and ensure light mode
    root.classList.remove("dark", "black", "white");
    
    // Set light mode in localStorage
    localStorage.setItem("theme", "light");
    
    // Clear any dark mode transitions
    root.style.transition = "";
  }, []);

  // This component now just shows a disabled sun icon
  return (
    <Button 
      variant={variant} 
      size={size}
      className={`transition-smooth ${showText ? 'gap-2' : ''} ${className} opacity-50 cursor-not-allowed`}
      disabled={true}
      title="Light mode only"
    >
      <Sun className="h-4 w-4" />
      {showText && (
        <span>Light Mode</span>
      )}
      <span className="sr-only">Light mode only</span>
    </Button>
  );
};
