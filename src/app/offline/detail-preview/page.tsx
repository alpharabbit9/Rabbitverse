/* TEMPORARY — visual check for the Project Details page. Delete before committing. */
import { ProjectDetail, type ProjectDetailData } from "@/components/projects/detail";

const rabbitverse: ProjectDetailData = {
  id: "rabbitverse",
  name: "RabbitVerse",
  status: "in_progress",
  description:
    "A unified personal growth and productivity platform that helps users manage different areas of life in one place.",
  logo: "/logo-mark.png",
  progress: 32,
  meta: [
    { icon: "LayoutDashboard", label: "Category", value: "Personal Growth" },
    { icon: "Code", label: "Type", value: "Full-stack Web App" },
    { icon: "ShieldCheck", label: "Visibility", value: "Private" },
    { icon: "Calendar", label: "Started", value: "Aug 31, 2024" },
    { icon: "Target", label: "Target", value: "Sep 5, 2024" },
  ],
  progressStats: [
    { icon: "Flame", label: "Days Worked", value: "6 days", accent: "var(--accent-orange)" },
    { icon: "Clock", label: "Days Left", value: "5 days", accent: "var(--accent-blue)" },
    { icon: "Target", label: "Milestones", value: "2 / 7", accent: "var(--accent-mint)" },
    { icon: "CheckCircle2", label: "Tasks", value: "18 / 56", accent: "var(--accent-purple)" },
  ],
  stats: [
    { icon: "Target", label: "Milestones", value: "2", total: "7", helper: "Completed", variant: "green" },
    { icon: "CheckCircle2", label: "Tasks", value: "18", total: "56", helper: "Completed", variant: "orange" },
    { icon: "Activity", label: "Completion", value: "32%", helper: "Overall Progress", variant: "blue" },
    { icon: "Clock", label: "Days Worked", value: "6", helper: "Total Days", variant: "purple" },
  ],
  timeline: {
    start: { label: "Project Started", date: "Aug 31, 2024" },
    today: { label: "Today", date: "Sep 2, 2024" },
    target: { label: "Target Date", date: "Sep 5, 2024" },
    progress: 40,
  },
  insights: {
    goals:
      "A unified personal growth platform that brings together goals, habits, fitness, finances, and personal progress into one intelligent system.",
    features: [
      "Unified dashboard for all life areas",
      "Goal & habit management",
      "Smart analytics & AI insights",
      "Fitness & workout tracking",
      "Finance & expense tracking",
      "AI-driven motivation & recommendations",
    ],
    problems: [
      "Using multiple apps with no connection",
      "Lack of a holistic view of life progress",
      "Hard to stay consistent without insights",
      "No proactive motivation or guidance",
      "Fragmented data leads to poor decisions",
    ],
  },
  milestones: [
    {
      id: 1,
      title: "Project Setup & Planning",
      description: "Define scope, tech stack, wireframes, and setup repositories.",
      start: "Aug 31",
      end: "Aug 31",
      status: "completed",
      progress: 100,
    },
    {
      id: 2,
      title: "Core Dashboard",
      description: "Build the unified dashboard with overview of goals, habits, and progress.",
      start: "Sep 1",
      end: "Sep 1",
      status: "completed",
      progress: 100,
    },
    {
      id: 3,
      title: "Goal & Habit Management",
      description: "Implement goal creation, habit tracking, streaks, and reminders.",
      start: "Sep 2",
      end: "Sep 2",
      status: "in_progress",
      progress: 60,
    },
    {
      id: 4,
      title: "Fitness & Workout Tracking",
      description: "Add workout logging, performance tracking, and analytics.",
      start: "Sep 3",
      end: "Sep 3",
      status: "planned",
      progress: 0,
    },
    {
      id: 5,
      title: "Finance & Expense Tracking",
      description: "Integrate expense tracking, budgeting, and financial insights.",
      start: "Sep 4",
      end: "Sep 4",
      status: "planned",
      progress: 0,
    },
    {
      id: 6,
      title: "AI Insights & Motivation",
      description: "Implement AI-driven insights, recommendations, and motivational system.",
      start: "Sep 4",
      end: "Sep 4",
      status: "planned",
      progress: 0,
    },
    {
      id: 7,
      title: "Testing & Launch",
      description: "Testing, bug fixes, and deploying the platform for users.",
      start: "Sep 5",
      end: "Sep 5",
      status: "planned",
      progress: 0,
    },
  ],
};

export default function Page() {
  return (
    <main className="min-h-screen bg-bg py-6 md:py-8 lg:py-10">
      <ProjectDetail data={rabbitverse} />
    </main>
  );
}
