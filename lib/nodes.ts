import {
  Bot,
  Calendar,
  CreditCard,
  FileEdit,
  FileText,
  HelpCircle,
  Lightbulb,
  Mic,
  Play,
  ScrollText,
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
  disabled?: boolean
}

export const nodeTypeLabels: Record<string, string> = {
  start: 'Start',
  youtube: 'YouTube Analyzer',
  pdf: 'PDF Reader',
  arxiv: 'ArXiv Paper',
  summarizer: 'Text Summarizer',
  'text-improver': 'Text Improver',
  flashcard: 'Flashcard Generator',
  quiz: 'Quiz Builder',
  'concept-extractor': 'Concepts Extractor',
  'web-browser-agent': 'Web Browser Agent',
  'essay-grader': 'Essay Grader',
  'study-plan': 'Study Plan Generator',
  'audio-transcriber': 'Audio Transcriber',
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
  arxiv: {
    icon: ScrollText,
    color: 'text-teal-600',
    disabled: true,
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
    disabled: true,
  },
  quiz: {
    icon: HelpCircle,
    color: 'text-orange-600',
    disabled: true,
  },
  'concept-extractor': {
    icon: Lightbulb,
    color: 'text-yellow-600',
  },
  'web-browser-agent': {
    icon: Bot,
    color: 'text-fuchsia-600',
    disabled: true,
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
    disabled: true,
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
}

const allNodeTypes = [
  { id: 'start', label: 'Start' },
  { id: 'youtube', label: 'YouTube Analyzer' },
  { id: 'pdf', label: 'PDF Reader' },
  { id: 'arxiv', label: 'ArXiv Paper' },
  { id: 'summarizer', label: 'Text Summarizer' },
  { id: 'text-improver', label: 'Text Improver' },
  { id: 'flashcard', label: 'Flashcard Generator' },
  { id: 'quiz', label: 'Quiz Builder' },
  { id: 'concept-extractor', label: 'Concept Extractor' },
  { id: 'web-browser-agent', label: 'Web Browser Agent' },
  { id: 'essay-grader', label: 'Essay Grader' },
  { id: 'study-plan', label: 'Study Plan Generator' },
  { id: 'audio-transcriber', label: 'Audio Transcriber' },
  { id: 'fact-check', label: 'Fact Checker' },
  { id: 'web-search', label: 'Web Search' },
]

export const availableNodeTypes = allNodeTypes.filter((node) => !nodeConfig[node.id]?.disabled)
