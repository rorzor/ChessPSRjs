# AGENTS.md

# Veiled Gambit — Agent Instructions

## Purpose

This repository contains **Veiled Gambit**, a deterministic two-player strategy game intended to support:

- human vs human play
- human vs heuristic AI play
- AI vs AI play
- large-scale headless simulation
- model training through self-play
- evaluation and benchmarking of trained and heuristic agents
- a local GUI for humans to test strategies against any available agent

The repository may currently contain a simple browser-based implementation in which the game rules, state management, and UI behaviour are partially coupled.

The primary architectural goal is to turn that implementation into a reusable **game engine** that becomes the single source of truth for all game rules.

Read `docs/ARCHITECTURE.md` before making structural changes.

---

## Core Engineering Principle

**The game engine is the source of truth.**

The browser UI, command-line tools, heuristic agents, simulations, training environments, and future learned models must all interact with the same engine.

Do not create separate implementations of the game rules for different consumers.

The engine must be:

- deterministic
- headless
- independent of HTML, DOM, browser, rendering, or user-input code
- independently unit-testable
- serializable
- suitable for fast repeated simulation
- safe against illegal actions
- explicit about legal actions
- usable by both humans and automated agents

Given the same state and the same action, the engine must always produce the same resulting state unless a future game rule explicitly introduces randomness. If randomness is ever introduced, it must be seeded and reproducible.

---

## Current Development Objective

The immediate objective is to **extract the existing game rules from the browser implementation into a deterministic headless engine without changing game behaviour**.

Do not begin with reinforcement learning, neural networks, or model training.

Build the simulation substrate first.

The preferred sequence is:

1. understand the existing implementation
2. establish test coverage for current rule behaviour
3. define canonical game-state structures
4. define canonical action structures
5. implement legal-action generation
6. implement pure state transitions
7. implement terminal-state and winner detection
8. migrate the existing browser UI to consume the engine
9. build a random legal-action agent
10. build a headless match runner
11. build heuristic agents
12. build evaluation and tournament tooling
13. expose a training-compatible environment
14. only then begin learned-agent and self-play work

---

## Agent Working Rules

### Before Editing

Before making significant changes:

1. Read this file.
2. Read `docs/ARCHITECTURE.md`.
3. Inspect the current repository.
4. Identify how the existing game represents:
   - board state
   - players
   - pieces
   - hidden information
   - turn state
   - action points
   - legal moves
   - spawning
   - redeployment
   - combat
   - victory conditions
5. Identify which current functions are pure game logic and which are coupled to the DOM or rendering.

For architectural work, briefly state which files will be created or modified before editing.

Do not rewrite working code merely for style.

---

## Scope Control

Work in small, reviewable phases.

When given a bounded task:

- implement only that task
- run relevant tests
- report failures
- fix failures caused by the change
- summarize what changed
- identify the next logical step
- do not automatically continue into a new phase unless instructed

Prefer a series of correct small changes over one large rewrite.

---

## Preservation of Existing Behaviour

The current browser game is a reference implementation unless the documented rules explicitly contradict it.

When extracting logic:

- preserve current observable game behaviour
- do not silently alter rules
- do not invent missing rules
- flag ambiguity
- write characterization tests when practical before refactoring behaviour

If the current implementation and documented rules disagree, stop changing that behaviour and report the discrepancy.

---

## Preferred Repository Shape

Adapt to the repository's existing language and build system rather than forcing this exact layout.

A preferred conceptual layout is:

```text
src/
  engine/
    game-state.*
    actions.*
    rules.*
    engine.*
    serialization.*
  agents/
    agent.*
    random-agent.*
    heuristic-agent.*
  simulation/
    match-runner.*
    tournament.*
    metrics.*
  ui/
    ...
  training/
    environment.*
    encoding.*

tests/
  engine/
  agents/
  simulation/

docs/
  ARCHITECTURE.md
```

Do not create layers that are not yet needed.

---

## Engine Contract

The engine should eventually expose concepts equivalent to:

```ts
initialState(...)
legalActions(state, player?)
applyAction(state, action)
isTerminal(state)
winner(state)
observation(state, player)
serializeState(state)
deserializeState(data)
```

Exact names may vary with the language and existing codebase.

### State transitions

Prefer immutable or effectively immutable state transitions:

```ts
const nextState = applyAction(state, action)
```

rather than mutating global UI state.

If mutation is used internally for performance, it must not allow one simulated game to accidentally affect another.

### Illegal actions

Illegal actions must not be silently accepted.

The engine should either:

- reject them with a clear error/result, or
- expose an explicit validated action API

Automated agents should normally select from `legalActions(...)`.

---

## Action Model

Actions should be explicit data, not UI events.

For example, a future action representation might conceptually resemble:

```ts
type Action =
  | { type: "move"; from: Square; to: Square }
  | { type: "spawn"; pieceType: PieceType; at: Square }
  | { type: "redeploy"; ... }
  | { type: "endTurn" }
```

This is illustrative only.

Derive the exact action types from the current rules and implementation.

Do not let an AI agent manipulate buttons, DOM elements, or coordinates in the rendered page as its primary game interface.

---

## Hidden Information

Veiled Gambit contains hidden-information mechanics.

Therefore distinguish between:

- **full internal state** used by the engine
- **player observation** containing only information legally visible to that player

Do not expose hidden opponent information through the standard agent observation API.

A simulator or referee may access full state.

An agent should normally receive only its legal observation.

This distinction is critical for future training integrity.

---

## Determinism and Reproducibility

Simulation and evaluation must be reproducible.

Where applicable:

- avoid dependence on wall-clock time
- avoid hidden global state
- use seeded pseudo-random generators
- record seeds used in experiments
- make initial conditions serializable
- make match results reproducible from configuration and seed

---

## Testing Requirements

Game rules should be tested independently from the UI.

Prioritize tests for:

- valid initial state
- initial piece placement
- turn sequencing
- action-point accounting
- movement legality
- board boundaries
- occupancy rules
- spawning rules
- redeployment rules
- combat resolution
- Rock/Paper/Scissors outcomes
- ownership changes or piece removal after combat
- home-square rules
- hidden-information visibility
- illegal-action rejection
- victory / defeat / terminal conditions
- serialization round trips
- deterministic replay

Tests should describe game behaviour, not implementation details.

---

## Agents

All agents should eventually satisfy one small common interface conceptually similar to:

```ts
interface Agent {
  chooseAction(
    observation: PlayerObservation,
    legalActions: Action[]
  ): Action
}
```

This should permit interchangeable:

- human input adapters
- random agents
- heuristic agents
- search agents
- learned policy agents

Do not place agent-specific logic inside the engine.

---

## Initial Heuristic Agents

Do not build these until the core engine and headless match runner are stable.

Useful early baselines include:

### RandomAgent

Chooses uniformly from legal actions.

Purpose:

- smoke testing
- simulation validation
- baseline win rate
- discovery of invalid engine states

### AggressiveHeuristicAgent

Tends to prefer:

- moves toward opponent territory
- engagements that appear favourable
- pressure on strategically important squares
- spawning when increased board presence is valuable

### DefensiveHeuristicAgent

Tends to prefer:

- preservation of pieces
- home-square protection
- favourable defensive positioning
- reduced exposure to uncertain combat

### BalancedHeuristicAgent

Combines:

- material
- positioning
- threat
- home-square pressure
- action efficiency

Do not encode privileged hidden information into heuristics intended to model legal players.

---

## Simulation

The headless simulator should eventually support:

```text
Agent A
   |
   v
Game Engine
   ^
   |
Agent B
```

It must not require:

- a browser
- HTML rendering
- mouse events
- delays
- animations

A batch runner should ultimately be able to execute many matches and return structured results such as:

- winner
- number of turns
- number of actions
- final state
- termination reason
- agent identifiers
- configuration
- random seed

---

## Training Architecture

Do not bind the core engine to one ML framework.

The preferred dependency direction is:

```text
training code
    |
    v
training environment / adapter
    |
    v
game engine
```

Never:

```text
game engine
    |
    v
PyTorch / TensorFlow / RL framework
```

The engine should remain lightweight and framework-independent.

A future environment may provide Gymnasium-like methods conceptually equivalent to:

```python
reset()
step(action)
observation
reward
terminated
legal_action_mask
```

but this should be an adapter around the engine rather than part of the engine itself.

---

## Performance

Correctness comes before optimization.

Once correctness is established:

- profile before optimizing
- minimize unnecessary allocation in simulation hot paths
- avoid rendering during self-play
- allow parallel independent games where safe
- separate logging verbosity from simulation execution

Do not compromise rule clarity prematurely for micro-optimizations.

---

## Documentation

Whenever architecture changes materially:

- update `docs/ARCHITECTURE.md`
- keep public interfaces documented
- update README instructions if commands or setup change

The README should eventually explain:

- how to run the human-vs-human game
- how to run tests
- how to run a headless match
- how to run AI-vs-AI matches
- how to benchmark agents
- how to start training
- how to play against a trained or heuristic model

---

## Definition of Done for a Task

A coding task is not complete until:

1. the requested behaviour is implemented
2. relevant tests exist or have been updated
3. tests pass, or failures are clearly explained
4. existing behaviour has not been unintentionally broken
5. newly introduced public interfaces are understandable
6. unnecessary unrelated changes have been avoided
7. the agent reports:
   - files changed
   - tests run
   - result
   - known limitations
   - recommended next step
