/* TEMPORARY — visual check for the project card. Delete before committing. */
import { ProjectCard, type ProjectCardData } from "@/components/projects/card";

const avatar = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 40% 45%)"/><circle cx="32" cy="24" r="12" fill="hsl(${hue} 30% 78%)"/><circle cx="32" cy="60" r="20" fill="hsl(${hue} 30% 70%)"/></svg>`,
  )}`;

const demo: ProjectCardData = {
  id: "rabbitverse",
  name: "Rabbitverse",
  subtitle: "Your all-in-one life OS",
  logo: "/logo-mark.png",
  status: "in_progress",
  progress: 32,
  daysLogged: 6,
  tags: [
    { name: "Full-stack", icon: "Code" },
    { name: "Frontend", icon: "Sparkles" },
    { name: "Backend", icon: "Server" },
    { name: "Mobile", icon: "Smartphone" },
    { name: "Web", icon: "Globe" },
    { name: "API", icon: "Cloud" },
  ],
  description: "A Life OS for your goals, habits & growth",
  teamMembers: [
    { id: "1", name: "Rifat Ahmed", avatar: avatar(20) },
    { id: "2", name: "Mira Chen", avatar: avatar(210) },
    { id: "3", name: "Sam Okafor", avatar: avatar(340) },
    { id: "4", name: "Lena Ross" },
    { id: "5", name: "Ivo Petrov" },
    { id: "6", name: "Ada Silva" },
  ],
};

const bare: ProjectCardData = {
  id: "bare",
  name: "Untitled Experiment",
  status: "on_hold",
  progress: 0,
};

const done: ProjectCardData = {
  ...demo,
  id: "done",
  name: "Portfolio Rebuild",
  subtitle: "A calmer place to keep the work",
  logo: undefined,
  status: "completed",
  progress: 100,
  daysLogged: 1,
  tags: [{ name: "Web", icon: "Globe" }],
  teamMembers: demo.teamMembers?.slice(0, 2),
};

export default function Page() {
  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-8 px-4 py-10">
      <ProjectCard project={demo} />
      <ProjectCard project={bare} />
      <ProjectCard project={done} />
    </main>
  );
}
