import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  BookOpen,
  Brain,
  Bus,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  FolderKanban,
  Heart,
  HeartPulse,
  Home,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  PenLine,
  Play,
  Plus,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  Wind,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  Activity, ArrowDown, ArrowRight, ArrowUp, Bell, BookOpen, Brain, Bus, Calendar,
  Check, CheckCircle2, ChevronRight, Dumbbell, Flame, FolderKanban, Heart, HeartPulse,
  Home, LayoutDashboard, Menu, Moon, MoreHorizontal, PenLine, Play, Plus, ReceiptText,
  Settings, ShoppingBag, Sparkles, Star, Sun, Target, TrendingDown, TrendingUp,
  Utensils, Wallet, Wind,
};

export function Icon({
  name,
  className,
  size = 18,
  strokeWidth = 2,
  style,
}: {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const Cmp = REGISTRY[name] ?? Sparkles;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} style={style} />;
}
