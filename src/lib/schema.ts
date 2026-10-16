import { z } from 'zod';

export const modes = ['academic', 'casual'] as const;
export type Mode = typeof modes[number];
const sectionIds = ['research', 'news', 'publications', 'projects', 'cv', 'writing', 'interests', 'about', 'contact'] as const;
const localOrExternal = z.string().min(1).refine(v => v.startsWith('/') || /^(https?:|mailto:)/.test(v), 'Use an absolute site path or URL');
const sectionList = z.array(z.enum(sectionIds)).refine(items => new Set(items).size === items.length, 'Sections must be unique');
const modeConfig = z.object({
  sections: sectionList,
  navigation: sectionList.optional(),
  sectionTitles: z.partialRecord(z.enum(sectionIds), z.string().min(1)).default({}),
  featuredProjects: z.array(z.string()).default([]),
}).refine(mode => !mode.navigation || mode.navigation.every(id => mode.sections.includes(id)), 'Navigation must refer to enabled sections');
export const configSchema = z.object({
  schemaVersion: z.literal(1),
  site: z.object({ title: z.string().min(1), description: z.string().min(1), url: z.url(), base: z.string().default('/'), language: z.string().default('en'), availableLanguages: z.array(z.string()).default(['en']), copyrightStartYear: z.number().int().min(1900).max(new Date().getUTCFullYear()).optional() }),
  identity: z.object({ name: z.string().min(1), handle: z.string().min(1), initials: z.string().min(1), role: z.string().min(1), institution: z.string().min(1), location: z.string(), address: z.string().optional(), contactNote: z.string().optional(), email: z.email(), photo: z.string().optional(), cv: z.string().optional() }),
  socials: z.array(z.object({ label: z.string(), href: localOrExternal, icon: z.string().regex(/^(brands|solid):[a-z0-9-]+$/).optional(), modes: z.array(z.enum(modes)).default(['academic','casual']) })),
  theme: z.object({ academic: z.string().regex(/^#[0-9a-f]{6}$/i), casual: z.string().regex(/^#[0-9a-f]{6}$/i) }),
  hero: z.object({ enabled: z.boolean().default(true), label: z.string(), intensity: z.number().min(0).max(2).default(1) }),
  modes: z.object({ academic: modeConfig, casual: modeConfig }),
  sectionLabels: z.partialRecord(z.enum(sectionIds), z.string().min(1)).default({}),
  projectCategories: z.record(z.string().regex(/^[a-z0-9_-]+$/), z.string().min(1)).default({work:'Research',library:'Libraries',fun:'Tools & apps',indie:'Games',retro:'Retro & emulation'}),
  blog: z.object({ href: localOrExternal, feedUrl: z.url().optional(), snapshot: z.string().optional() }),
  comments: z.object({ repo: z.string(), repoId: z.string(), category: z.string(), categoryId: z.string(), mapping: z.literal('pathname') }).optional(),
});
export const entrySchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/), title: z.string().min(1), description: z.string().min(1),
  legacyPath: z.string().regex(/^\/[\w/-]+\/$/),
  image: z.string().optional(), category: z.string().default('work'), categories: z.array(z.string()).default([]), tags: z.array(z.string()).default([]),
  modes: z.array(z.enum(modes)).default(['academic', 'casual']), order: z.number().default(100),
  date: z.preprocess(v=>v instanceof Date?v.toISOString():v,z.string().optional()), comments: z.boolean().default(false), featured: z.boolean().default(false),
  status: z.string().optional(), links: z.array(z.object({label:z.string(),href:localOrExternal,icon:z.string().regex(/^(brands|solid):[a-z0-9-]+$/).optional()})).default([]),
});
export type Entry = z.infer<typeof entrySchema> & { body: string; kind: string };
export type Publication = { id: string; title: string; author: string; year: string; venue: string; abstract: string; doi?: string; pdf?: string; preview?: string; bibtex: string; volume?:string; number?:string; pages?:string; url?:string; cnki?:string; gbt?:string; date?:string; venueUrl?:string; abbr?:string };
export type Route = { path: string; title: string; kind: string; entry?: Entry; entries?: Entry[]; description?: string };
export const profileSchema = z.object({
  headline: z.string().optional(), casualHeadline: z.string().optional(), summary: z.string(), casualSummary: z.string(), background: z.string().default(''),
  research: z.array(z.object({ title: z.string(), description: z.string() })),
  interests: z.array(z.object({ title: z.string(), description: z.string(), href: localOrExternal.optional() })),
  toolkit: z.array(z.object({label:z.string(),items:z.array(z.string())})).default([]),
});
const timelineSchema = z.object({ title: z.string(), institution: z.string(), start: z.string(), end: z.string(), description: z.string().default(''),url:localOrExternal.optional(),location:z.string().optional() });
export const cvSchema = z.object({ education: z.array(timelineSchema), work: z.array(timelineSchema), languages: z.array(z.string()), skills: z.array(z.string()), basics:z.object({label:z.string(),summary:z.string(),phone:z.string().optional(),url:localOrExternal.optional(),address:z.string().optional()}).optional() });
