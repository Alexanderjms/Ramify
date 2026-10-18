import type { GoalActivity } from "./goal-activities";

export type Goal = {
  activities?: GoalActivity[];
  id?: string;
  icon?: string;
  name: string;
  description: string;
  color: string;
  progress: number;
  tasks: number;
  completedTasks: number;
  activity: string;
};

export const demoGoals: Goal[] = [
  {
    name: "Aprender inglés",
    description: "Práctica de vocabulario, comprensión y conversación.",
    color: "#FFFFFF",
    progress: 35,
    tasks: 20,
    completedTasks: 7,
    activity: "Hace 5 min",
  },
  {
    name: "Aprender programación",
    description: "Fundamentos de programación y desarrollo de proyectos.",
    color: "#A78BFA",
    progress: 52,
    tasks: 25,
    completedTasks: 13,
    activity: "Hace 1 h",
  },
  {
    name: "Conseguir empleo",
    description: "Gestión de candidaturas y preparación de entrevistas.",
    color: "#FFFFFF",
    progress: 20,
    tasks: 15,
    completedTasks: 3,
    activity: "Hace 2 h",
  },
];
