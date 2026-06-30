import {
  Calendar,
  CircleCheck,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Layers,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";

export const AVATAR_GRADIENTS: Record<string, string> = {
  "av-1": "linear-gradient(135deg, #2d6a4f, #40916c)",
  "av-2": "linear-gradient(135deg, #1b4332, #2d6a4f)",
  "av-3": "linear-gradient(135deg, #52b788, #40916c)",
  "av-4": "linear-gradient(135deg, #7b3fe4, #5b2cb3)",
  "av-5": "linear-gradient(135deg, #3d5af1, #2742c5)",
  "av-6": "linear-gradient(135deg, #c99016, #a07212)",
  "av-7": "linear-gradient(135deg, #d63e70, #a52f56)",
  "av-8": "linear-gradient(135deg, #e07b30, #b86225)",
  "av-9": "linear-gradient(135deg, #3a3a3a, #1a1a1a)",
  "av-10": "linear-gradient(135deg, #0f766e, #0e5c57)",
};

export const HERO_FEATURE_ICONS = [Calendar, Layers, Globe, CircleCheck] as const;

export const TOPIC_ICONS = [MapPin, FileText, DollarSign, Clock, Users, TrendingUp] as const;

export const fontSans = "font-[family-name:var(--font-dm-sans)]";
export const fontSerif = "font-[family-name:var(--font-dm-serif)]";

import { localizePath, type Locale } from "@/lib/i18n/config";

export type WebinarPageMode = "student" | "public";

export function webinarDetailHref(
  id: number,
  mode: WebinarPageMode,
  locale: Locale = "en",
): string {
  return mode === "public"
    ? localizePath(`/webinars/${id}`, locale)
    : `/student/webinars/${id}`;
}

export function webinarsListHref(mode: WebinarPageMode, locale: Locale = "en"): string {
  return mode === "public" ? localizePath("/webinars", locale) : "/student/webinars";
}
