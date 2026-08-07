import { z } from "zod";

export const BrandSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  concept: z.string().min(1),
  audience: z.string().min(1),
  voice: z.object({
    tone: z.string(),
    perspective: z.string(),
    bannedPhrases: z.array(z.string()).default([]),
    mustSoundLike: z.string(),
  }),
  topics: z.object({
    pillars: z.array(z.string()).min(1),
    seedQueries: z.array(z.string()).min(1),
    avoid: z.array(z.string()).default([]),
  }),
  quality: z.object({
    minChars: z.number().int().positive().default(3500),
    minSections: z.number().int().positive().default(5),
    minConcreteExamples: z.number().int().nonnegative().default(3),
    minActionSteps: z.number().int().nonnegative().default(4),
    maxSlopScore: z.number().min(0).max(1).default(0.35),
    requireOriginalTake: z.boolean().default(true),
  }),
  publishing: z.object({
    platform: z.enum(["wordpress", "blogger", "naver", "filesystem"]).default("filesystem"),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    locale: z.string().default("ko-KR"),
  }),
  safety: z
    .object({
      requireFactualOnly: z.boolean().default(true),
      allowClickbaitTitle: z.boolean().default(true),
      blockUnverifiedStats: z.boolean().default(true),
    })
    .default({}),
});

export const PlatformConnectionSchema = z.object({
  wordpress: z
    .object({
      baseUrl: z.string().optional(),
      username: z.string().optional(),
      appPassword: z.string().optional(),
      connectedAt: z.string().optional(),
    })
    .optional(),
  blogger: z
    .object({
      blogId: z.string().optional(),
      accessToken: z.string().optional(),
      connectedAt: z.string().optional(),
    })
    .optional(),
  naver: z
    .object({
      blogUrl: z.string().optional(),
      blogId: z.string().optional(),
      note: z.string().optional(),
      connectedAt: z.string().optional(),
    })
    .optional(),
});

export type PlatformConnections = z.infer<typeof PlatformConnectionSchema>;

export type Brand = z.infer<typeof BrandSchema>;

export type TopicCandidate = {
  titleAngle: string;
  searchIntent: string;
  pillar: string;
  hook: string;
  whyNow: string;
  outlinePromise: string[];
  score: number;
};

export type ResearchBrief = {
  topic: TopicCandidate;
  keyFacts: string[];
  readerPain: string[];
  uniqueAngles: string[];
  actionFramework: string[];
  sourcesNote: string;
};

export type ArticleDraft = {
  brandId: string;
  title: string;
  slug: string;
  excerpt: string;
  markdown: string;
  html: string;
  tags: string[];
  metaDescription: string;
  wordCount: number;
  charCount: number;
};

export type QualityReport = {
  passed: boolean;
  score: number;
  slopScore: number;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
};

export type ProduceResult = {
  brandId: string;
  topic: TopicCandidate;
  article: ArticleDraft;
  quality: QualityReport;
  published?: { platform: string; id?: string; url?: string; mode: string };
  attempts: number;
};
