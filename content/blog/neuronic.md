---
title: Neuronic
excerpt: Mastering Research
date: 03/02/2026
---

# Building Neuronic

**March 2026**

---

Most study apps are glorified text editors with a flashcard button bolted on. No understanding of *what* you're learning, no sense of *how well* you know it, nothing about *what to do next*.

I built Neuronic to fix that. It's an AI study platform where every note feeds into a living model of your knowledge — extracting concepts, tracking mastery, detecting gaps, and driving you toward real understanding through active recall, spaced repetition, and targeted practice.

| Metric | Value |
|--------|-------|
| Frontend pages | **28** |
| Database models | **50+** |
| Study modalities | **6** |
| Embedding dimensions | **384** |

---

## The Seven Pillars

Every feature in Neuronic maps to one of seven stages in a learning lifecycle. This isn't marketing — it's an engineering constraint. Every line of code serves one of these:

```
┌─────────┐ ┌────────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ ┌───────┐ ┌─────────────┐
│ 01       │ │ 02         │ │ 03       │ │ 04     │ │ 05   │ │ 06    │ │ 07          │
│ Capture  │ │ Understand │ │ Organize │ │ Retain │ │ Act  │ │ Track │ │ Collaborate │
└─────────┘ └────────────┘ └──────────┘ └────────┘ └──────┘ └───────┘ └─────────────┘
```

**Capture** — Multi-modal input: markdown, Excalidraw canvas, moodboards, PDF/PPTX uploads, YouTube transcript imports, arXiv ingestion, Whisper voice transcription, and a Chrome extension for web clipping.

**Understand** — AI analysis via Claude. Every note gets its concepts, definitions, formulas, prerequisites, and summaries extracted. This feeds the knowledge graph and concept mastery system.

**Organize** — Folders, tags, `[[bidirectional links]]`, and a force-directed knowledge graph visualizing connections between notes and concepts.

**Retain** — The engine. SM-2 spaced repetition on flashcards *and* notes, AI-generated quizzes, Feynman technique with voice-based explanation scoring, and Socratic dialogue where Claude probes your understanding.

**Act** — Study plans parsed from syllabi, todos, Pomodoro timers, focus mode, and an IFTTT-style automation engine.

**Track** — Dashboard with activity heatmaps, weak area detection, performance trends, knowledge gap visualization, and smart nudges.

**Collaborate** — Study groups with shared notes, Q&A forum with voting and bounties, synchronized Pomodoro rooms, and friend activity feeds.

---

## System Architecture

Neuronic is a monorepo: React frontend, FastAPI backend, SQLite database. The AI layer sits between the backend and Claude's API, with FastEmbed handling local vector embeddings for hybrid search.

```mermaid
graph LR
    subgraph Frontend
        A["React 19 + Vite 7<br/><small>Tailwind · CodeMirror · Excalidraw</small>"]
    end

    subgraph Chrome Extension
        B["Manifest V3<br/><small>Web Clipper</small>"]
    end

    subgraph Backend ["Backend — FastAPI (async)"]
        C[Auth / JWT]
        D[Notes / Files]
        E[Knowledge]
        F[Study Tools]
        G[Automations Engine]
    end

    subgraph AI Layer
        H["Claude API"]
        I["FastEmbed<br/><small>bge-small-en-v1.5</small>"]
        J["Whisper STT"]
    end

    subgraph Database
        K["SQLite (WAL)<br/><small>SQLAlchemy · 50+ models · async sessions</small>"]
    end

    subgraph Cache ["Cache & Queue"]
        L["Redis · Celery<br/><small>S3 / MinIO storage</small>"]
    end

    A -- "REST + SSE" --> C
    B -. "REST" .-> C
    C --> D
    C --> E
    C --> F
    C --> G
    D --> H
    D --> I
    D --> J
    D --> K
    G --> L
    E --> K
    F --> K
```

Deliberately simple. SQLite in WAL mode handles concurrent reads without contention. Async FastAPI means long-running AI calls don't block the event loop. Redis caches hot paths (note lists, dashboard data), Celery handles background jobs like audio transcription and batch analysis.

API keys are encrypted at rest with Fernet symmetric encryption. Users can bring their own Anthropic keys — they're never stored in plaintext. The server falls back to its own key pool when none is provided.

---

## The Note Analysis Pipeline

When you save a note, a cascade of background processing turns raw text into structured knowledge. This pipeline is the backbone of everything else — concept mastery, knowledge gaps, smart search, and study recommendations all depend on it.

```mermaid
flowchart TD
    A["01 · User Saves Note"] --> B["02 · Extract Markdown"]
    A --> C["03 · Generate Embedding<br/><small>FastEmbed · bge-small-en · 384d</small>"]

    B --> D["04 · CLAUDE ANALYSIS<br/>Concepts · Definitions · Formulas<br/>Prerequisites · Summary · Tags"]
    C --> E["05 · Store in note_embeddings"]

    D --> F["SYNC CONCEPTS<br/><small>user_concepts + sources</small>"]
    D --> G["STORE ANALYSIS<br/><small>note_analyses JSON</small>"]
    D --> H["SCHEDULE REVIEW<br/><small>SM-2 initial state</small>"]
    D --> I["FIRE EVENT<br/><small>note_created trigger</small>"]

    F -. "downstream" .-> J["Update knowledge graph<br/><small>mastery + prerequisites</small>"]
    G -. "downstream" .-> K["Feed insights tab<br/><small>definitions, formulas, tags</small>"]
    I -. "downstream" .-> L["Run automations<br/><small>flashcards, todos, etc.</small>"]

    style A fill:#1a1a1a,stroke:#c4a759,color:#c4a759
    style D fill:#1a1a1a,stroke:#c4a759,color:#c4a759
    style F fill:#1a1a1a,stroke:#f47068,color:#f47068
    style G fill:#1a1a1a,stroke:#e8a855,color:#e8a855
    style H fill:#1a1a1a,stroke:#56d6a0,color:#56d6a0
    style I fill:#1a1a1a,stroke:#58a6ff,color:#58a6ff
```

Steps 3-5 run concurrently. The embedding is computed locally via FastEmbed (BAAI/bge-small-en-v1.5, 384 dimensions) — no external API call needed. Claude analysis runs in parallel and fans out to four downstream consumers: concept sync, analysis storage, review scheduling, and the automation event bus.

---

## Spaced Repetition at Scale

Most apps apply SM-2 to flashcards alone. I apply it to *everything* — flashcards, notes, and concepts.

- **Flashcards**: Classic flip-and-rate. Quality 0-5, explicit user rating.
- **Notes**: Active recall mode. See the title, try to recall the content, rate your recall 1-4.
- **Quiz feedback loop**: Quiz scores passively update the source note's SM-2 state. Bad score? Shorter interval. Good score? It recedes.

```mermaid
flowchart LR
    A["REVIEW DUE<br/>Card or Note"] --> B["RATE QUALITY<br/>0-2: Again<br/>3-5: Advance"]

    B -- "q < 3" --> C["RESET<br/><code>interval = 1, reps = 0</code>"]
    B -- "q ≥ 3" --> D["ADVANCE<br/><code>EF' = EF + 0.1 - (5-q)(0.08+(5-q)*0.02)</code><br/><code>interval *= ease_factor</code>"]

    C --> E["SCHEDULE<br/>next_review"]
    D --> E

    style A fill:#1a1a1a,stroke:#c4a759,color:#c4a759
    style B fill:#1a1a1a,stroke:#58a6ff,color:#58a6ff
    style C fill:#1a1a1a,stroke:#f47068,color:#f47068
    style D fill:#1a1a1a,stroke:#56d6a0,color:#56d6a0
    style E fill:#1a1a1a,stroke:#c4a759,color:#c4a759
```

**Example interval progression:**

```
 ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
 │  1d  │ ─→ │  6d  │ ─→ │ 15d  │ ─→ │ 38d  │ ─→ │ 95d  │ ─→  ...
 │ new  │    │learn │    │review│    │mature│    │master│
 └──────┘    └──────┘    └──────┘    └──────┘    └──────┘
```

The interesting part is the quiz feedback loop. When you take a quiz generated from a note, the score updates that note's SM-2 state. Score below 60%? Interval resets, note resurfaces sooner. Above 80%? Ease factor goes up, note recedes. Turns out this creates spaced repetition that works even if you never explicitly review notes.

---

## Knowledge Graph & Concept Mastery

This is where everything converges. Every concept extracted from every note becomes a node. Edges form when two concepts co-occur in the same document. Mastery is a weighted blend of flashcard performance, quiz scores, and Feynman technique assessments.

```mermaid
flowchart LR
    subgraph Sources
        S1[Note Analysis]
        S2[Flashcard Reviews]
        S3[Quiz Scores]
        S4[Feynman Sessions]
    end

    S1 --> M["COMPUTE MASTERY<br/>Weighted blend → 0-100%<br/><small>per concept, per user</small>"]
    S2 --> M
    S3 --> M
    S4 --> M

    M --> KG["KNOWLEDGE GRAPH<br/>━━━━━━━━━━━━━━━━<br/>🔵 80-100%  🟢 60-80%<br/>🟡 20-60%   🔴 0-20%"]

    KG -. "prerequisite<br/>analysis" .-> GAP["GAP DETECTION<br/>Prerequisite not yet studied?<br/>→ Surface in dashboard<br/>→ One-click generate"]

    style M fill:#1a1a1a,stroke:#c4a759,color:#c4a759
    style GAP fill:#1a1a1a,stroke:#f47068,color:#f47068
```

Gap detection is probably my favorite part. It compares a note's prerequisites against your known concepts. If you're studying eigenvalues but have never touched linear algebra, the dashboard surfaces that gap with a one-click button to auto-generate a prerequisite note via Claude.

---

## Hybrid Search & RAG

Search combines three signals: **semantic similarity** (cosine distance on 384-dim embeddings), **keyword matching** (substring in titles and content), and **recency boost** (recently edited notes rank higher). The RAG pipeline uses this same search to ground Claude's responses in your own notes.

```mermaid
flowchart LR
    Q["USER QUERY<br/><small>'explain entropy'</small>"] --> EMB["EMBED<br/><small>FastEmbed 384d</small>"]

    EMB --> SEM["SEMANTIC<br/><small>cosine similarity</small>"]
    EMB --> KEY["KEYWORD<br/><small>title + content</small>"]
    EMB --> REC["RECENCY<br/><small>time decay boost</small>"]

    SEM --> RANK["RANK<br/>weighted merge"]
    KEY --> RANK
    REC --> RANK

    RANK --> RAG["RAG<br/>Claude + context"]

    style Q fill:#1a1a1a,stroke:#c4a759,color:#c4a759
    style EMB fill:#1a1a1a,stroke:#56d6a0,color:#56d6a0
    style SEM fill:#1a1a1a,stroke:#58a6ff,color:#58a6ff
    style KEY fill:#1a1a1a,stroke:#e8a855,color:#e8a855
    style REC fill:#1a1a1a,stroke:#56d6a0,color:#56d6a0
    style RANK fill:#1a1a1a,stroke:#c4a759,color:#c4a759
    style RAG fill:#1a1a1a,stroke:#c4a759,color:#c4a759
```

---

## Six Study Modalities

### Flashcards
AI-generated with duplicate detection. Keyboard-driven sessions. SM-2 scheduling. Export to Anki.

### Quizzes
Multiple choice, true/false, fill-in-the-blank. Exam simulation mode with strict timers and no peeking.

### Note Review
Active recall queue. See the title, reconstruct the content mentally, rate your recall. SM-2 scheduled.

### Feynman Technique
Explain a concept aloud or in writing. AI scores your understanding 0-100 and identifies gaps.

### Socratic Dialogue
AI asks probing questions to test understanding. Adaptive difficulty based on your responses.

### Focus Sessions
Pomodoro timers, subject lock-in, distraction blocking, and streak tracking.

---

## The Automation Engine

The automation engine bridges passive capture and active learning. You define if-this-then-that rules: triggers fire on events like "PDF uploaded" or "quiz score below 60%", and actions execute asynchronously — generating flashcards, creating todos, posting to forums, or sending notifications.

```mermaid
flowchart LR
    EV["EVENT FIRED<br/><small>pdf_uploaded<br/>quiz_completed</small>"] --> MATCH["MATCH RULES<br/><small>Check conditions<br/>score < 60? type = pdf?</small>"]

    MATCH --> EXEC["EXECUTE ACTION<br/><small>Generate flashcards<br/>Create review todo<br/>Send notification</small>"]

    EXEC --> LOG["LOG<br/><small>audit trail</small>"]

    style EV fill:#1a1a1a,stroke:#58a6ff,color:#58a6ff
    style MATCH fill:#1a1a1a,stroke:#c4a759,color:#c4a759
    style EXEC fill:#1a1a1a,stroke:#56d6a0,color:#56d6a0
```

Events process asynchronously via `fire_event()`. Every rule match is logged, and failed actions retry with exponential backoff. So you can set up something like "whenever I upload a PDF, generate 10 flashcards and create a review todo for next week" — and never think about it again.

---

That's Neuronic. Studying should be intelligent, not just diligent.

---

*neuronic.study · 2026*
