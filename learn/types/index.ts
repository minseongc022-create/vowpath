export type SidebarTab = "mindmap" | "curriculum" | "notes";

export type NoteRecord = {
  id: string;
  title: string;
  content: string;
  lessonId?: string | null;
  updatedAt: string;
};

export type PlannerRecord = {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  completed: boolean;
  priority: number;
  updatedAt: string;
};
