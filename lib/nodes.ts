import {
  Bot,
  Calendar,
  FileEdit,
  FileText,
  Lightbulb,
  Play,
  Search as SearchIcon,
  ShieldCheck,
  Sparkles,
  Wand2,
  Workflow,
  Youtube,
  type LucideIcon,
} from 'lucide-react'

export type NodeType = {
  icon: LucideIcon
  color: string
}

export const nodeTypeLabels: Record<string, string> = {
  start: 'Start',
  youtube: 'YouTube Analyzer',
  pdf: 'PDF Reader',
  summarizer: 'Text Summarizer',
  'text-improver': 'Text Improver',
  'concept-extractor': 'Concepts Extractor',
  'essay-grader': 'Essay Grader',
  'study-plan': 'Study Plan Generator',
  'web-search': 'Web Search',
  'fact-check': 'Fact Checker',
}

export const nodeConfig: Record<string, NodeType> = {
  start: {
    icon: Play,
    color: 'text-green-600',
  },
  youtube: {
    icon: Youtube,
    color: 'text-red-600',
  },
  pdf: {
    icon: FileText,
    color: 'text-blue-600',
  },
  summarizer: {
    icon: Sparkles,
    color: 'text-purple-600',
  },
  'text-improver': {
    icon: Wand2,
    color: 'text-cyan-600',
  },
  'concept-extractor': {
    icon: Lightbulb,
    color: 'text-yellow-600',
  },
  'web-browser-agent': {
    icon: Bot,
    color: 'text-fuchsia-600',
  },
  'essay-grader': {
    icon: FileEdit,
    color: 'text-rose-600',
  },
  'study-plan': {
    icon: Calendar,
    color: 'text-violet-600',
  },
  'fact-check': {
    icon: ShieldCheck,
    color: 'text-lime-600',
  },
  'web-search': {
    icon: SearchIcon,
    color: 'text-amber-600',
  },
  default: {
    icon: Workflow,
    color: 'text-slate-600',
  },
  // audio transcriber
  // web browser agent
  // generate quiz
  // generate flashcards
}

export const availableNodeTypes = [
  { id: 'start', label: 'Start' },
  { id: 'youtube', label: 'YouTube Analyzer' },
  { id: 'pdf', label: 'PDF Reader' },
  { id: 'summarizer', label: 'Text Summarizer' },
  { id: 'text-improver', label: 'Text Improver' },
  { id: 'concept-extractor', label: 'Concept Extractor' },
  { id: 'essay-grader', label: 'Essay Grader' },
  { id: 'study-plan', label: 'Study Plan Generator' },
  { id: 'fact-check', label: 'Fact Checker' },
  { id: 'web-search', label: 'Web Search' },
]
