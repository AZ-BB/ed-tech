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
  type LucideIcon,
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

export const FAQS_PUBLIC = [
  {
    q: "Are Univeera webinars free?",
    a: "Yes. Webinars are free for students, families and school counselors unless otherwise stated.",
  },
  {
    q: "Who can attend?",
    a: "Students, families and school counselors are welcome. Most sessions are designed for students in Grades 11 and 12.",
  },
  {
    q: "How do I receive the webinar link?",
    a: "After you register, Univeera will email you the meeting link when the session starts, plus a reminder the day before.",
  },
  {
    q: "Are the sessions recorded?",
    a: "Some sessions are recorded and shared after the webinar, depending on the speaker and topic.",
  },
  {
    q: "Can I ask questions during the session?",
    a: "Yes. Most webinars include a live Q&A section where students and families can ask questions.",
  },
  {
    q: "How often are webinars hosted?",
    a: "Univeera hosts webinars every two weeks, with additional sessions added during key application periods.",
  },
] as const;

export const FAQS = [
  {
    q: "Are Univeera webinars free?",
    a: "Yes. Webinars are free for registered students and families unless otherwise stated.",
  },
  {
    q: "Who can attend?",
    a: "Students, families and school counselors are welcome. Most sessions are designed for students in Grades 11 and 12.",
  },
  {
    q: "How do I receive the webinar link?",
    a: "After you register, Univeera will email you the meeting link when the session starts, plus a reminder the day before.",
  },
  {
    q: "Are the sessions recorded?",
    a: "Some sessions are recorded and shared after the webinar, depending on the speaker and topic.",
  },
  {
    q: "Can I ask questions during the session?",
    a: "Yes. Most webinars include a live Q&A section where students and families can ask questions.",
  },
  {
    q: "How often are webinars hosted?",
    a: "Univeera hosts webinars every two weeks, with additional sessions added during key application periods.",
  },
] as const;

export const HERO_FEATURES = [
  { icon: Calendar, label: "Bi-weekly live sessions" },
  { icon: Layers, label: "Expert-led guidance" },
  { icon: Globe, label: "Built for Middle East students" },
  { icon: CircleCheck, label: "Free for registered students" },
] as const;

export const TOPICS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: MapPin,
    title: "Study destinations",
    desc: "UK, US, Canada, Europe, Australia and GCC university options.",
  },
  {
    icon: FileText,
    title: "Application guidance",
    desc: "UCAS, Common App, essays, recommendation letters, interviews and deadlines.",
  },
  {
    icon: DollarSign,
    title: "Scholarships & funding",
    desc: "How to find scholarships, understand eligibility and submit stronger applications.",
  },
  {
    icon: Clock,
    title: "Major & career exploration",
    desc: "Helping students connect their interests and strengths to future careers.",
  },
  {
    icon: Users,
    title: "Student & alumni stories",
    desc: "Real experiences from Middle Eastern students studying locally and abroad.",
  },
  {
    icon: TrendingUp,
    title: "Career & professional pathways",
    desc: "How to break into consulting, banking, and tech — plus internships, networks, and life beyond graduation.",
  },
];

export const fontSans = "font-[family-name:var(--font-dm-sans)]";
export const fontSerif = "font-[family-name:var(--font-dm-serif)]";

export type WebinarPageMode = "student" | "public";

export function webinarDetailHref(id: number, mode: WebinarPageMode): string {
  return mode === "public" ? `/webinars/${id}` : `/student/webinars/${id}`;
}

export function webinarsListHref(mode: WebinarPageMode): string {
  return mode === "public" ? "/webinars" : "/student/webinars";
}
