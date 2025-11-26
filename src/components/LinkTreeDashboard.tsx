import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Grid3X3, 
  List,
  Star,
  ArrowLeft,
  Eye,
  Plus,
  Settings,
  Palette,
  BarChart3,
  Users,
  ShoppingBag,
  Camera,
  Phone,
  Calendar,
  Type,
  Zap,
  Save,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
    theme: {
      primaryColor: '#38bdf8',
      backgroundColor: '#000000',
      backgroundType: 'color' as const,
      backgroundGif: '',
      iconStyle: 'rounded',
      buttonStyle: 'filled'
    },