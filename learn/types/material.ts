export type MaterialType = "YOUTUBE" | "PDF" | "TEXT" | "NOTE";

export type MaterialStatus =
  | "PENDING"
  | "EXTRACTING"
  | "CHUNKING"
  | "TRANSCRIBING"
  | "ANALYZING"
  | "READY"
  | "FAILED";

export type MindmapTreeNode = {
  id: string;
  label: string;
  summary?: string;
  children?: MindmapTreeNode[];
};

export type MaterialChunkRecord = {
  id: string;
  chunkIndex: number;
  startSec?: number | null;
  endSec?: number | null;
  rawContent: string;
  cleanedContent?: string | null;
  status: string;
};

export type AnalysisSection = {
  title: string;
  points: string[];
};

export type MaterialAnalysisRecord = {
  summary: string;
  sections: AnalysisSection[];
  keyPoints: string[];
  keywords: string[];
  mindmapTree: MindmapTreeNode[];
  analyzedAt: string;
};

export type MaterialRecord = {
  id: string;
  type: MaterialType;
  status: MaterialStatus;
  title: string;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  linkedCourse?: string | null;
  linkedLesson?: string | null;
  fullTranscript?: string | null;
  errorMessage?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  chunks?: MaterialChunkRecord[];
  analysis?: MaterialAnalysisRecord | null;
  progress?: {
    totalChunks: number;
    completedChunks: number;
    phase: MaterialStatus;
  };
};

export type CreateMaterialInput = {
  type: MaterialType;
  title?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  text?: string;
  tags?: string[];
  linkedCourse?: string;
  linkedLesson?: string;
};

export type IngestProgressEvent = {
  materialId: string;
  status: MaterialStatus;
  message: string;
  progress?: number;
};
