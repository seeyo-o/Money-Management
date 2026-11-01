import React from 'react';
import {
  Building2,
  CreditCard,
  Smartphone,
  ShoppingBag,
  Banknote,
  Utensils,
  Car,
  Zap,
  Home,
  Receipt,
  HeartPulse,
  Coffee,
  Tv,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  Coins,
  CheckCircle2,
  CircleDot,
  LayoutDashboard,
  Wallet,
  PieChart,
  FileText,
  LogOut,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Calendar,
  Printer,
  Download,
  Search,
  Filter,
  Trash2,
  Shirt,
  Wrench,
} from 'lucide-react';

type IconType = React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;

const ICON_MAP: Record<string, IconType> = {
  Building2,
  CreditCard,
  Smartphone,
  ShoppingBag,
  Banknote,
  Utensils,
  Car,
  Zap,
  Home,
  Receipt,
  HeartPulse,
  Coffee,
  Tv,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  Coins,
  CheckCircle2,
  CircleDot,
  LayoutDashboard,
  Wallet,
  PieChart,
  FileText,
  LogOut,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Calendar,
  Printer,
  Download,
  Search,
  Filter,
  Trash2,
  Shirt,
  Wrench,
};

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-4 h-4', size = 16 }) => {
  const IconComponent = ICON_MAP[name] || CircleDot;
  return <IconComponent className={className} size={size} />;
};
