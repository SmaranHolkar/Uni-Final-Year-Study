# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
University and college students preparing for exams who need to deeply understand their own lecture notes, diagnose cognitive blind spots, and generate custom study tools.

## Product Purpose
Transform passive rereading into active, grounded understanding. HydrusLearn Pro allows students to upload their actual study documents (PDFs, slides, notes), automatically generate targeted active-recall quizzes with confidence calibration, inspect source passage citations in a split viewer, build custom interactive study modules (flashcards, crosswords, simulations, diagrams), and review mistake patterns in Mind's Mirror.

## Positioning
Unlike generic flashcard apps (Anki, Quizlet) that require manual card creation and lack document grounding, or generic AI chat wrappers that hallucinate answers, HydrusLearn Pro combines:
1. Strict RAG grounding on student notes with paragraph citations.
2. Metacognitive confidence calibration (identifying high-confidence errors vs recall lapses).
3. Mind's Mirror cognitive mistake pattern analysis across study history.
4. Interactive Studio Canvas for multi-archetype study tool generation (3D simulations, blurting kits, matching, flashcards).

## Operating Context
- Web application used on desktop laptops, tablets, and mobile devices during intense study and revision blocks.
- Works directly with messy lecture slides, dense PDFs, multi-modal notes (YouTube transcripts, OCR images).
- Dual study modes: Quick Sandbox (rapid tool generator) and Flagship Pro Studio (quiz calibration, metacognition, long-term history).

## Capabilities and Constraints
- PDF/document parsing and vector embeddings stored in Supabase storage bucket & pgvector (`w_embeddings`).
- AI-powered tool generation orchestrator (`/api/chat-tools`) delivering interactive sandboxed tools.
- Metacognitive calibration analysis (`/api/metacognitive-analysis/:quizId`).
- Persistent user history, session drawers, and linked study context.
- High-contrast, accessibility-compliant dark theme by default.

## Brand Commitments
- Name: HydrusLearn Pro
- Voice: Intelligent, rigorous, encouraging, precise, no-slop academic companion ("Vela").
- Aesthetics: High-craft dark slate UI, electric sapphire & ice cyan accents, zero decorative clutter.

## Product Principles
1. Grounded in Student Truth: Every question, citation, and study tool maps back to the student's own material.
2. Metacognition Over Memorisation: Focus on how the student thinks and where their confidence is misplaced, not just vanity scores.
3. High-Craft, Anti-Slop Interface: Clean typography, coherent layout hierarchy, zero generic AI clichés.
4. Active, Multi-Modal Learning: Provide the right tool archetype for the concept (simulations, flashcards, quizzes, diagrams).

## Accessibility & Inclusion
- High-contrast text meeting WCAG AA standards.
- Keyboard navigable controls (Ctrl+J, Escape modals, standard focus rings).
- Responsive viewports across desktop and mobile.
