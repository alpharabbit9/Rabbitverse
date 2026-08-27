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
  Globe,
  Heart,
  HeartPulse,
  Home,
  LayoutDashboard,
  Menu,
  Mic,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  PenLine,
  Play,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Square,
  Star,
  Sun,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  Activity, ArrowDown, ArrowRight, ArrowUp, Bell, BookOpen, Brain, Bus, Calendar,
  Check, CheckCircle2, ChevronRight, Dumbbell, Flame, FolderKanban, Globe, Heart, HeartPulse,
  Home, LayoutDashboard, Menu, Mic, Moon, MoreHorizontal, NotebookPen, Pencil, PenLine, Play, Plus, ReceiptText,
  Search, Settings, ShoppingBag, Sparkles, Square, Star, Sun, Target, Trash2, TrendingDown, TrendingUp,
  Utensils, Wallet, Wind, X,
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
