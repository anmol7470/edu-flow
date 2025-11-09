# EduFlow

An AI-powered educational workflow builder that helps students automate educational tasks through visual workflows.

## Description

EduFlow is a modern web application that combines visual workflow building with AI-powered educational tools. Users can create custom workflows by connecting various AI-powered nodes including essay grading, fact checking, text improvement, concept extraction, study plan generation, and more. The platform provides an intuitive drag-and-drop interface for building educational automation pipelines.

## Features

### Available Workflow Nodes

- **Essay Grader** - Grade essays using AI with customizable rubrics (supports PDF documents)
- **Fact Checker** - Verify claims and check facts in text using web search
- **Text Improver** - Enhance writing quality, grammar, and style
- **Text Summarizer** - Generate concise summaries of long content
- **Concept Extractor** - Extract key concepts and topics from text
- **Study Plan Generator** - Create personalized study plans
- **Web Search** - Search the web for information
- **YouTube Analyzer** - Scrape YouTube video transcript for text analysis
- **Web Browser Agent** - Headless agentic browser automation tool

### Workflow Features

- Visual drag-and-drop workflow builder
- Real-time execution status tracking
- Node configuration with custom parameters
- Connection validation and error handling
- Workflow saving and loading
- Support for complex multi-step workflows

## Tech Stack

### Frontend

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality UI components
- **[React Flow](https://reactflow.dev/)** - Visual workflow canvas
- **[Lucide React](https://lucide.dev/)** - Icon library

### Backend & Services

- **[Convex](https://convex.dev/)** - Real-time backend and database
- **[Trigger.dev](https://trigger.dev/)** - Background task orchestration
- **[Better Auth](https://www.better-auth.com/)** - Authentication system
- **[Supadata](https://supadata.com/)** - Web & Video to text API for makers
- **[Vercel AI SDK](https://sdk.vercel.ai/)** - AI model integration library
- **[Nova Act](https://nova.amazon.com/act)** - Headless agentic browser automation tool

### AI Models

- **[Anthropic Claude Sonnet 4.5](https://www.anthropic.com/claude)** - Primary AI model for text processing
- **[Google AI](https://ai.google.dev/)** - Additional AI capabilities

### Package Manager

- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager

## Project Structure

```
edu-flow/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── start-workflow/       # Workflow execution
│   │   └── trigger-*/            # Task trigger endpoints
│   ├── workflow/[id]/            # Workflow editor page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── workflow-canvas.tsx       # Visual workflow editor
│   ├── workflow-node.tsx         # Workflow node component
│   ├── workflow-sidebar.tsx      # Tool palette
│   └── *-sheet.tsx               # Configuration sheets for each tool
│
├── convex/                       # Convex backend
│   ├── _generated/               # Auto-generated types
│   ├── auth.config.ts            # Auth configuration
│   ├── schema.ts                 # Database schema
│   ├── workflows.ts              # Workflow queries/mutations
│   ├── workflowEngine.ts         # Workflow execution logic
│   ├── workflowActions.ts        # Workflow operations
│   ├── nodeExecutions.ts         # Node execution tracking
│   └── http.ts                   # HTTP endpoints
│
├── trigger/                      # Trigger.dev tasks
│   ├── essay-grader.ts           # Essay grading task
│   ├── fact-checker.ts           # Fact checking task
│   ├── text-improver.ts          # Text improvement task
│   ├── text-summarizer.ts        # Text summarization task
│   ├── concept-extractor.ts      # Concept extraction task
│   ├── study-plan-generator.ts   # Study plan generation task
│   ├── web-search.ts             # Web search task
│   └── youtube-analyzer.ts       # YouTube analysis task
│
├── lib/                          # Utility libraries
│   ├── types.ts                  # TypeScript type definitions
│   ├── nodes.ts                  # Node type definitions
│   ├── workflow-utils.ts         # Workflow helper functions
│   ├── workflow-validation.ts    # Workflow validation logic
│   ├── auth-client.ts            # Auth client utilities
│   └── utils.ts                  # General utilities
│
├── novaact/                      # NovaAct Python API server
│   ├── main.py                   # Main API server
│   └── pyproject.toml            # Python project configuration
│
└── trigger.config.ts             # Trigger.dev configuration
```

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd edu-flow
```

2. Install dependencies:

```bash
bun install
```

3. Copy the `.env.example` file to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

4. Set up Convex:

```bash
# Login to Convex
bun run dev:convex
```

5. Set up Trigger.dev:

```bash
# Login to Trigger.dev
bun run dev:trigger
```

6. Setup NovaAct Python API server:

```bash
cd novaact
uv sync
uv run main.py
```

6. Start the development server:

```bash
bun run dev
```
