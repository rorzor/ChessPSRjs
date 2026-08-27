# Veiled Gambit — Current Game Rules

This document records the rules currently represented by the browser implementation in `index.html`. It is a characterization of the existing implementation, not a redesign or a specification of future engine behavior.

## Board and Players

- The board is 8 × 8.
- There are two players, identified internally as Player 1 and Player 2.
- Coordinates use `x` for the column and `y` for the row, both ranging from 0 through 7.
- The board is stored as `board[y][x]`.
- Player 1's home square is `(0, 0)`.
- Player 2's home square is `(7, 7)`.
- The normal game starts with Player 1 as the current player.

## Pieces and Hidden Identity

Each piece has:

- an owner: Player 1 or Player 2
- an identity: `red`, `green`, or `blue`
- a `revealed` flag

Each player starts with three pieces, one of each identity. The pieces are placed near that player's home square:

- Player 1 positions: `(0, 1)`, `(1, 0)`, and `(1, 1)`
- Player 2 positions: `(7, 6)`, `(6, 7)`, and `(6, 6)`

The identity assignment and the assignment of pieces to starting positions are randomized during initialization.

A piece's identity is normally hidden in the board display. A revealed piece displays its identity. While the peek control is held, the current player's pieces are displayed with their identities.

## Turns and Action Points

- Players alternate turns.
- A turn begins with 3 action points (AP).
- Moving one square costs 1 AP.
- Redeploying costs 2 AP.
- Respawning costs 3 AP and consumes the entire turn.
- When an action reduces AP to zero, the turn automatically ends.
- Ending a turn switches the current player and resets that player's AP to 3.
- There is no separate explicit end-turn action in the current implementation; a turn ends automatically when AP reaches zero.

## Movement

A move is legal when all of the following are true:

- the current player has at least 1 AP
- the source and destination are within the 8 × 8 board
- the destination is exactly one orthogonal square away from the source
- the source contains a piece owned by the current player
- the destination is not occupied by another piece owned by the current player

Diagonal movement is not permitted. Moving onto an opponent's piece initiates combat.

After a legal move, 1 AP is deducted. If no AP remains, the turn changes immediately.

## Combat

Combat occurs when a piece moves onto a square occupied by an opponent's piece. Both pieces are revealed before the result is resolved.

The identity relationships are:

- Red defeats Green.
- Green defeats Blue.
- Blue defeats Red.
- Matching identities result in a draw.

Results:

- If the attacking piece wins, it moves onto the destination square and the defending piece is removed.
- If the defending piece wins, the attacking piece is removed and the defending piece remains in place.
- If the identities match, neither piece changes position or ownership.
- Combat still costs the attacking player 1 AP, regardless of the result.
- Pieces revealed through combat remain revealed in the current implementation.

## Redeployment

A current-player piece may be redeployed when:

- at least 2 AP remain
- the selected square contains a piece owned by the current player

Redeployment changes that piece's identity to the selected identity (`red`, `green`, or `blue`), hides the piece again, and costs 2 AP.

If this uses the player's final 2 AP, the turn ends automatically.

The current implementation does not impose an additional restriction requiring the new identity to differ from the old identity.

## Spawning / Respawning

A player may respawn a piece only when all of the following are true:

- the player has exactly 3 AP remaining
- the player's home square is empty
- the player has fewer than 3 pieces on the board

The new piece is placed on the player's home square with the identity selected by the player:

- Player 1 respawns at `(0, 0)`.
- Player 2 respawns at `(7, 7)`.

Respawning sets AP to zero and immediately ends the turn.

The browser interface labels this action as respawning, while the broader project architecture may refer to it as spawning.

## Victory

A player wins when one of their pieces reaches the opponent's home corner:

- Player 1 wins at `(7, 7)`.
- Player 2 wins at `(0, 0)`.

The victory check is performed after a move. The browser UI reports the result with a win alert.

The current implementation does not define a separate terminal-state object or a persistent winner field; the move operation reports a win result to the UI.

## Rule Ownership and Current Architecture

The current rules are implemented primarily by the `GameState` class in `index.html`. The `GameUI` class handles selection, DOM events, rendering, identity-selection controls, and presentation of the win message.

The intended future architecture is to move these rules into a deterministic, headless engine while keeping the browser UI as a consumer of that engine. Any extraction should preserve the behavior documented here unless the rules are deliberately changed and this document is updated accordingly.

## Implementation Notes

- Initialization currently uses JavaScript's global `Math.random()` for identity and position shuffling, so initial setups are not seed-controlled.
- The current state representation is mutable: board cells contain mutable `Piece` objects, and actions update the `GameState` instance in place.
- Legal movement is checked by `isValidMove`; movement, combat, AP deduction, turn advancement, and victory checking are performed by `move`.
