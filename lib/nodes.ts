import {
  Bot,
  Calendar,
  CreditCard,
  FileEdit,
  FileText,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Mic,
  Play,
  Search as SearchIcon,
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
  flashcard: 'Flashcard Generator',
  quiz: 'Quiz Builder',
  tutor: 'AI Tutor',
  'concept-extractor': 'Concepts Extractor',
  'web-browser-agent': 'Web Browser Agent',
  'essay-grader': 'Essay Grader',
  'study-plan': 'Study Plan Generator',
  'audio-transcriber': 'Audio Transcriber',
  'web-search': 'Web Search',
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
  flashcard: {
    icon: CreditCard,
    color: 'text-emerald-600',
  },
  quiz: {
    icon: HelpCircle,
    color: 'text-orange-600',
  },
  tutor: {
    icon: GraduationCap,
    color: 'text-indigo-600',
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
  'audio-transcriber': {
    icon: Mic,
    color: 'text-pink-600',
  },
  'web-search': {
    icon: SearchIcon,
    color: 'text-amber-600',
  },
  default: {
    icon: Workflow,
    color: 'text-slate-600',
  },
}

export const availableNodeTypes = [
  { id: 'start', label: 'Start' },
  { id: 'youtube', label: 'YouTube Analyzer' },
  { id: 'pdf', label: 'PDF Reader' },
  { id: 'summarizer', label: 'Text Summarizer' },
  { id: 'text-improver', label: 'Text Improver' },
  { id: 'flashcard', label: 'Flashcard Generator' },
  { id: 'quiz', label: 'Quiz Builder' },
  { id: 'tutor', label: 'AI Tutor' },
  { id: 'concept-extractor', label: 'Concept Extractor' },
  { id: 'web-browser-agent', label: 'Web Browser Agent' },
  { id: 'essay-grader', label: 'Essay Grader' },
  { id: 'study-plan', label: 'Study Plan Generator' },
  { id: 'audio-transcriber', label: 'Audio Transcriber' },
  { id: 'web-search', label: 'Web Search' },
]

