# Veiled Gambit Architecture

## 1. Purpose

This document defines the target software architecture for **Veiled Gambit**.

The project should evolve from a browser-only human-vs-human implementation into a general game platform capable of supporting:

- human vs human
- human vs AI
- AI vs AI
- heuristic-agent development
- automated tournament evaluation
- high-volume headless self-play
- reinforcement-learning environments
- trained policy/value models
- local interactive testing against models in development

The central architectural requirement is that **all consumers share one canonical implementation of the game rules**.

---

# 2. Architectural Overview

The desired dependency structure is:

```text
                         +----------------------+
                         |      Browser UI      |
                         | human input/rendering|
                         +----------+-----------+
                                    |
                                    v
+----------------+        +----------------------+        +----------------+
| CLI / Debug UI |------->|                      |<-------| Match Simulator|
+----------------+        |      GAME ENGINE     |        +----------------+
                          |                      |
+----------------+        | canonical rules     |        +----------------+
| Human Adapter  |------->| canonical state     |<-------| Agent Interface |
+----------------+        | legal actions       |        +-------+--------+
                          | state transitions    |                |
                          | terminal detection   |       +--------+---------+
                          +----------+-----------+       |                  |
                                     |               Heuristics        Learned
                                     |                                Agents
                                     v
                          +----------------------+
                          | Training Environment |
                          | / framework adapters |
                          +----------+-----------+
                                     |
                                     v
                          +----------------------+
                          | RL / self-play code  |
                          +----------------------+
```

The game engine must not depend on any layer above it.

---

# 3. Design Goals

## 3.1 One Rule Implementation

The browser, simulator, heuristic agents, and ML environment must not contain duplicated rule logic.

Examples of logic that belongs exclusively in the engine include:

- whether a piece may move
- what squares are legal
- whether an action costs an action point
- whether spawning is legal
- whether redeployment is legal
- how combat resolves
- when a turn ends
- when a game ends
- who wins

UI code may *display* those decisions but must not independently decide them.

---

## 3.2 Headless Operation

The game must be executable without a browser.

The following should eventually be possible:

```bash
run-match random aggressive
```

and:

```bash
run-tournament --agent-a heuristic-a --agent-b heuristic-b --games 10000
```

The exact commands are implementation-dependent.

The important requirement is that simulation does not require DOM, rendering, animation, or human input.

---

## 3.3 Deterministic State Transitions

The fundamental abstraction should be:

```text
state + action -> next state
```

For example:

```ts
nextState = applyAction(state, action)
```

This property allows:

- testing
- replay
- search
- rollouts
- MCTS
- self-play
- reproducible debugging
- deterministic evaluation

Any future randomness must be explicit and seeded.

---

## 3.4 Player-Relative Observation

Because Veiled Gambit includes hidden information, full game state and player-visible state must be separated.

Conceptually:

```text
FullGameState
    |
    +--> observationFor(Player1)
    |
    +--> observationFor(Player2)
```

The engine/referee may know all hidden information.

Agents must not automatically receive it.

This distinction should exist early, even if the current UI implementation does not yet formalize it.

---

# 4. Known Core Game Concepts

The current implementation and established design should be treated as the authoritative source during extraction.

Known concepts include:

- an 8 x 8 board
- two players
- home squares associated with opposing sides
- three core piece types based on Rock / Paper / Scissors
- hidden information associated with piece identity or placement
- orthogonal movement
- action points per turn
- move actions
- spawn actions
- redeployment actions
- Rock/Paper/Scissors combat resolution
- initial setup involving one of each piece type near the player's home area

Where exact rules remain ambiguous, the implementation agent must inspect the existing code rather than inventing behaviour.

If repository behaviour conflicts with project documentation, flag the discrepancy.

---

# 5. Core Domain Model

The exact implementation will depend on the repository's current language.

Conceptually, the engine should contain the following domain objects.

## 5.1 Player

Example:

```ts
type Player = "player1" | "player2"
```

Avoid relying on UI labels or colours as the canonical identity.

---

## 5.2 Piece Type

Example:

```ts
type PieceType = "rock" | "paper" | "scissors"
```

Use enums, discriminated unions, constants, or equivalent language mechanisms rather than arbitrary strings where practical.

---

## 5.3 Square / Position

A board position should have one canonical representation.

Examples:

```ts
type Square = {
  row: number
  column: number
}
```

or:

```ts
type Square = string
```

such as `"A1"`.

Either is acceptable if consistently implemented.

Conversion between display notation and engine coordinates should be centralized.

---

## 5.4 Piece

A piece should contain only domain state.

Conceptually:

```ts
type Piece = {
  id: PieceId
  owner: Player
  type: PieceType
  position: Square
}
```

If hidden-information mechanics require additional state such as revealed/concealed status, include it explicitly.

Do not infer hidden state from DOM classes or rendered assets.

---

## 5.5 Turn State

Turn state should explicitly represent information such as:

```ts
type TurnState = {
  currentPlayer: Player
  actionPointsRemaining: number
  turnNumber: number
}
```

If the game has phases within a turn, represent them explicitly.

Avoid UI booleans that indirectly imply phases.

---

## 5.6 Game State

A canonical state should contain every fact required to continue a match without referencing the UI.

Conceptually:

```ts
type GameState = {
  board: BoardState
  pieces: Piece[]
  turn: TurnState
  status: GameStatus
  ...
}
```

A serialized `GameState` should be sufficient to:

1. save a match
2. reload it
3. determine legal actions
4. continue play
5. reproduce the same future behaviour

---

# 6. Action Model

Actions should be represented as domain data.

Do not pass button clicks or raw DOM events into game logic.

A possible conceptual representation is:

```ts
type GameAction =
  | {
      type: "move"
      pieceId: PieceId
      to: Square
    }
  | {
      type: "spawn"
      pieceType: PieceType
      at: Square
    }
  | {
      type: "redeploy"
      ...
    }
  | {
      type: "endTurn"
    }
```

The final representation should match the actual rules.

This design makes actions:

- enumerable
- serializable
- loggable
- replayable
- usable by agents
- usable as ML action targets

---

# 7. Engine API

The engine should expose a small public API.

A recommended conceptual interface is:

```ts
interface GameEngine {
  createInitialState(config?: GameConfig): GameState

  legalActions(
    state: GameState,
    player?: Player
  ): GameAction[]

  applyAction(
    state: GameState,
    action: GameAction
  ): GameState

  isTerminal(
    state: GameState
  ): boolean

  winner(
    state: GameState
  ): Player | null

  observationFor(
    state: GameState,
    player: Player
  ): PlayerObservation
}
```

Additional functions may be implemented where useful.

Prefer small pure functions over a large mutable god object.

---

# 8. Legal Action Generation

`legalActions(state)` is one of the most important engine operations.

Automated agents should normally choose from this set.

Benefits include:

- agents cannot accidentally generate malformed moves
- search algorithms can enumerate branches
- policy outputs can be masked
- debugging is simpler
- illegal-action behaviour can be tested centrally

The legal-action generator should account for:

- current player
- action points remaining
- board occupancy
- movement constraints
- spawning restrictions
- redeployment restrictions
- any turn-phase restrictions
- terminal states

A terminal game should expose no normal gameplay actions.

---

# 9. Applying Actions

`applyAction` should:

1. validate the action
2. resolve its consequences
3. update action points
4. resolve combat if relevant
5. update visibility/reveal state if relevant
6. test for terminal conditions
7. advance the turn when required
8. return the resulting state

Avoid performing UI side effects from this function.

Do not:

- modify HTML
- show alerts
- play animations
- read keyboard input
- call browser APIs

Those belong to presentation layers.

---

# 10. Combat

Combat belongs entirely inside the engine.

The Rock/Paper/Scissors relationship should have one canonical implementation.

Conceptually:

```text
Rock defeats Scissors
Scissors defeats Paper
Paper defeats Rock
```

Ties and any special capture behaviour should be derived from the current rules.

Prefer a table or explicit pure function that is easy to test.

Example conceptual API:

```ts
resolveCombat(attacker, defender): CombatResult
```

Combat results should contain structured information if consumers need to display what occurred.

---

# 11. Hidden Information Architecture

This is strategically important for future AI development.

A learned agent must not be trained on information unavailable to a legal player unless explicitly conducting an oracle experiment.

Therefore distinguish:

```text
GameState
```

from:

```text
PlayerObservation
```

A player observation might contain:

- own pieces and identities
- visible opponent positions
- opponent identities only where legally revealed
- current player
- remaining action points
- relevant public game history

The exact visibility rules must match the game rules.

### Simulator responsibility

The simulator/referee owns the full state.

### Agent responsibility

The agent receives:

```text
observation + legal actions
```

and chooses an action.

This interface prevents accidental information leakage.

---

# 12. UI Architecture

The browser UI should become a thin client over the engine.

Its responsibilities should be limited to:

- rendering current state
- displaying player-relative information
- receiving human input
- converting input into a `GameAction`
- submitting that action to the engine
- rendering the resulting state
- displaying errors or results
- handling animation/presentation

Conceptually:

```text
user click
   |
   v
UI converts click -> Action
   |
   v
engine.applyAction(...)
   |
   v
next GameState
   |
   v
UI renders next state
```

The UI must not separately calculate the result of the move.

---

# 13. Agent Interface

All automated agents should satisfy a common interface.

Conceptually:

```ts
interface Agent {
  chooseAction(
    observation: PlayerObservation,
    legalActions: GameAction[]
  ): GameAction
}
```

Agent implementations may be synchronous initially.

A future asynchronous wrapper can support remote models or services without changing the engine.

---

# 14. Baseline Agents

Baseline agents are essential because trained models require something to compare against.

## 14.1 Random Agent

Behaviour:

```text
obtain legal actions
choose one uniformly at random
return it
```

Uses a seeded RNG during evaluation.

Purpose:

- baseline
- simulation smoke testing
- illegal-state discovery
- regression testing

---

## 14.2 Simple Heuristic Scoring

A useful pattern is:

```text
score(action, state)
```

then select the legal action with highest score.

Possible features include:

- material advantage
- distance to objectives
- threat to opponent home
- threat to own home
- favourable combat opportunity
- piece preservation
- board control
- mobility
- action-point efficiency
- uncertainty / information value

Weights should be configurable.

---

## 14.3 Heuristic Variants

Initial baselines may include:

### Aggressive

Higher weight on:

- advancing
- combat
- home pressure
- material capture

### Defensive

Higher weight on:

- home defence
- survival
- avoiding uncertain engagements
- maintaining coverage

### Balanced

Moderate weighting across strategic categories.

These baselines provide increasingly meaningful opponents for future models.

---

# 15. Match Runner

The match runner sits above the engine.

Conceptually:

```ts
runMatch({
  agent1,
  agent2,
  initialState,
  seed
})
```

Pseudo-flow:

```text
state = initialState

while not terminal:
    player = currentPlayer(state)
    observation = observationFor(state, player)
    legal = legalActions(state)

    action = agent[player].chooseAction(
        observation,
        legal
    )

    state = applyAction(state, action)

return result
```

The runner should impose safeguards such as:

- maximum turn count
- invalid-agent-action handling
- deterministic seeding
- structured termination reasons

---

# 16. Match Result

Use structured output.

Conceptually:

```ts
type MatchResult = {
  winner: Player | null
  turns: number
  actions: number
  terminationReason: string
  seed?: number
}
```

Additional metrics may be collected later.

Avoid relying solely on console logs.

---

# 17. Batch Simulation

A batch system should support repeated independent matches.

Conceptually:

```ts
runMatches({
  agent1,
  agent2,
  games: 10000,
  seed: 1234
})
```

Potential aggregate outputs:

- Player 1 win rate
- Player 2 win rate
- draw rate
- mean game length
- median game length
- termination reasons
- average branching factor
- action-type frequencies

Store aggregate statistics separately from detailed traces.

---

# 18. Evaluation Harness

The evaluation layer should eventually support reproducible comparisons between agents.

For example:

```text
Agent A vs Agent B
Agent A vs Random
Agent B vs Random
Agent A vs AggressiveHeuristic
Agent B vs AggressiveHeuristic
```

Prefer swapping player positions so first-player advantage can be measured.

Record:

- agent version
- game-engine version
- configuration
- random seeds
- number of matches
- results
- runtime

---

# 19. Replay and Game Logs

A game should ideally be reproducible from:

```text
initial state
+
ordered action list
```

A replay format might conceptually contain:

```json
{
  "engineVersion": "...",
  "seed": 42,
  "initialState": {},
  "actions": []
}
```

This is useful for:

- debugging
- regression tests
- analysing agent mistakes
- reproducing unusual failures
- creating training data

---

# 20. Training Environment

The training environment must be an adapter around the engine.

The engine must not import an RL framework.

Conceptually:

```text
RL Algorithm
    |
    v
Environment Adapter
    |
    v
Game Engine
```

A Gymnasium-style adapter may eventually expose:

```python
observation, info = env.reset(seed=...)
observation, reward, terminated, truncated, info = env.step(action)
```

It should also expose legal-action information.

---

# 21. Observation Encoding

The domain-level `PlayerObservation` should not be designed solely around a neural-network tensor.

Keep two layers:

```text
PlayerObservation
        |
        v
ObservationEncoder
        |
        v
Tensor / feature vector
```

This permits experimentation with different representations without changing game rules.

Potential future encodings include:

- flat feature vectors
- board planes/channels
- entity lists
- transformer token sequences
- graph representations

---

# 22. Action Encoding

Likewise distinguish:

```text
GameAction
```

from:

```text
model action index
```

Use an adapter:

```text
index -> candidate GameAction
```

or define a stable action vocabulary plus a legal-action mask.

The engine should never have to know the neural network's output dimensions.

---

# 23. Legal Action Masking

For policy models, illegal actions should normally be masked.

Conceptually:

```text
policy logits
+
legal action mask
=
legal policy distribution
```

This is generally preferable to asking the model to learn fundamental rule legality from penalties alone.

The environment/action encoder should produce this mask.

---

# 24. Reward Design

Do not finalize reward shaping prematurely.

Begin with the cleanest objective possible:

```text
win  -> +1
loss -> -1
draw -> 0
```

or equivalent.

Only introduce intermediate rewards where experiments demonstrate a need.

Potential shaping signals may later include:

- material advantage
- strategic positioning
- home-square pressure
- information gain

Any shaping must be designed carefully so that it does not reward behaviour that diverges from actually winning.

---

# 25. Self-Play

Once a stable training adapter exists, learned agents may train via self-play.

Conceptually:

```text
Policy version N
       |
       +--------+
       |        |
       v        v
     Agent A  Agent B
        \       /
         \     /
        Game Engine
             |
             v
        trajectories
             |
             v
          learner
             |
             v
       Policy version N+1
```

Do not make the latest policy its only opponent forever.

A stronger future system may use an opponent pool containing:

- random agents
- heuristics
- older policy snapshots
- current policy
- selected strong historical policies

This reduces catastrophic forgetting and creates more stable evaluation.

---

# 26. Model-Agnostic Training

The engine should not care whether an agent uses:

- tabular methods
- DQN
- PPO
- actor-critic
- MCTS
- AlphaZero-style policy/value networks
- transformers
- external LLM reasoning
- hand-authored heuristics

The engine contract remains:

```text
observation
+
legal actions
->
chosen action
```

---

# 27. Search Agents

Before or alongside RL, the engine should support search.

Pure state transitions and legal action generation naturally enable:

- minimax where appropriate
- expectiminimax if randomness exists
- Monte Carlo rollouts
- Monte Carlo Tree Search

Hidden information complicates perfect-information search, so naive minimax should not be assumed to model the actual game correctly.

Possible future approaches include:

- determinization
- information-set search
- belief-state methods
- ISMCTS

These belong above the engine.

---

# 28. Versioning

Changes to rules can invalidate:

- tests
- saved games
- replay files
- heuristics
- datasets
- trained models

Therefore consider exposing an engine/rules version in serialized artefacts.

Do not implement elaborate migration infrastructure prematurely, but avoid assuming saved states will always be timeless.

---

# 29. Suggested Development Phases

## Phase 0 — Repository Archaeology

Goal:

Understand the current implementation.

Deliverables:

- map current files
- identify state representation
- locate rule logic
- identify UI coupling
- list ambiguous rules
- propose extraction boundaries

No behavioural changes.

---

## Phase 1 — Characterization Tests

Goal:

Capture current game behaviour before significant refactoring.

Focus on:

- movement
- AP use
- combat
- spawning
- redeployment
- turn changes
- victory

Deliverable:

A test suite representing the existing rules.

---

## Phase 2 — Canonical Domain Model

Goal:

Introduce:

- `GameState`
- `Player`
- `Piece`
- `Square`
- `GameAction`
- turn state

No DOM dependencies.

---

## Phase 3 — Legal Action Generator

Goal:

Implement:

```text
legalActions(state)
```

with comprehensive tests.

---

## Phase 4 — Pure State Transition Engine

Goal:

Implement:

```text
applyAction(state, action)
```

including:

- validation
- AP accounting
- movement
- spawning
- redeployment
- combat
- turn progression
- terminal detection

---

## Phase 5 — Browser Migration

Goal:

Make the existing UI a consumer of the engine.

There should no longer be a second independent rules implementation in the browser layer.

---

## Phase 6 — Observation / Hidden Information Boundary

Goal:

Implement:

```text
observationFor(state, player)
```

and tests proving that hidden opponent information is not leaked.

---

## Phase 7 — Random Agent

Goal:

Implement the common agent interface and a seeded random baseline.

---

## Phase 8 — Headless Match Runner

Goal:

Run complete AI-vs-AI games without a browser.

---

## Phase 9 — Batch Evaluation

Goal:

Execute many matches and aggregate results.

Add safeguards against infinite games.

---

## Phase 10 — Heuristic Agents

Goal:

Add multiple interpretable baselines.

At minimum:

- random
- aggressive
- defensive
- balanced

---

## Phase 11 — Human vs Agent GUI

Goal:

Allow the browser UI to replace either player with an `Agent`.

The user should be able to choose:

```text
Human
Random
Aggressive
Defensive
Balanced
future-trained-model
```

without changing game rules.

---

## Phase 12 — Training Adapter

Goal:

Create model-independent:

- observation encoders
- action encoders
- legal masks
- environment reset/step interface

---

## Phase 13 — Initial Learned Agent

Goal:

Train a simple baseline policy.

Do not optimize for state-of-the-art performance initially.

The purpose is to prove the full pipeline:

```text
engine
-> environment
-> training
-> saved model
-> inference agent
-> GUI
```

---

## Phase 14 — Self-Play System

Goal:

Introduce:

- policy snapshots
- opponent pools
- evaluation gates
- repeatable experiments
- training metrics

---

# 30. Initial Hermes Workflow

The first Hermes interaction after adding this document should be an analysis-only task.

Recommended prompt:

```text
Read AGENTS.md and docs/ARCHITECTURE.md, then inspect the entire repository.

Do not modify any files.

Produce a repository archaeology report covering:

1. the current file structure
2. where game state is represented
3. where each game rule is implemented
4. where rules are coupled to DOM/rendering code
5. current turn and action-point handling
6. movement implementation
7. spawning implementation
8. redeployment implementation
9. combat implementation
10. victory/terminal-state implementation
11. hidden-information handling
12. existing tests, if any
13. discrepancies between the existing implementation and the architecture documents
14. a minimal staged refactoring plan

Recommend the smallest safe first implementation task.

Do not implement anything yet.
```

Review this output before asking Hermes to edit the repository.

---

# 31. Recommended First Implementation Prompt

Once the archaeology report is satisfactory:

```text
Implement only the first approved refactoring phase.

Before editing:
- state the exact files you plan to modify or create
- explain the behavioural boundary being extracted

Requirements:
- preserve current game behaviour
- do not redesign the UI
- introduce no ML dependencies
- keep game logic independent of the DOM
- add or update tests
- run the relevant tests

After implementation report:
- files changed
- tests run
- test results
- any rule ambiguities discovered
- known limitations
- recommended next phase

Do not proceed into the next phase.
```

---

# 32. Long-Term Success Criteria

The architecture is successful when all of the following are true.

### One engine

Human games, AI games, simulations, and training use exactly the same canonical rule implementation.

### Headless

Thousands of games can run without launching a browser.

### Testable

Rule correctness can be tested independently.

### Reproducible

Given a game configuration, agents, and random seed, evaluation can be reproduced.

### Hidden-information safe

Agents cannot accidentally inspect privileged game state.

### Agent-independent

Any compatible agent can be substituted without modifying the engine.

### Framework-independent

The engine does not depend on PyTorch, TensorFlow, Gymnasium, or a particular RL algorithm.

### GUI-compatible

A human can play against heuristic and trained agents using the same engine.

### Training-compatible

The engine can support large-scale self-play and experimentation without architectural rewrites.
