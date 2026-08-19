# General Interactive Simulation & Sandbox Blueprint Specification

## Overview
This blueprint guides the AI to build general **Interactive Step-by-Step Simulations, Logic Trainers, and Interactive Sandboxes**.

## Core Requirements & Domain Architecture

### 1. Interactive Step-by-Step Simulation Flow
- **Phase Sequence / State Machine**:
  - The simulation maintains a explicit state index (`currentStep` / `systemState`).
  - Clear narration explaining **WHAT** happens in the active state and **WHY** it occurs according to underlying scientific, mathematical, or algorithm rules.
- **Interactive Controls**:
  - Play, Pause, Next Step, Previous Step, Fast Forward, Reset.
  - Interactive parameter controls (speed, inputs, state options).

### 2. Graphical Canvas / SVG Workbench
- Rich HTML5 Canvas or SVG vector canvas displaying the system state.
- Node/Component click inspector: clicking any part displays its role, mechanism, and state parameters.
- Animated state transitions (particles, arrows, glow highlights).

### 3. Quiz & Decision Challenges
- Option to toggle "Challenge Mode": Learner predicts the outcome of the next state transition before proceeding.
- Instant feedback with explanation on correct vs incorrect choices.

### 4. Technical Rules
- Self-contained single-file HTML app.
- Styled using clean dark UI design system.
- Responsive layout across desktop and mobile.
