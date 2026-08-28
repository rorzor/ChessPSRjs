const test = require('node:test');
const assert = require('node:assert/strict');
const { GameState, Piece } = require('../game-state.js');
const { createMoveAction, applyGameAction, legalActions } = require('../game-action.js');

function withRandomValues(values, callback) {
    const originalRandom = Math.random;
    let index = 0;
    Math.random = () => values[index++ % values.length];
    try {
        return callback();
    } finally {
        Math.random = originalRandom;
    }
}

function newState() {
    return withRandomValues([0], () => new GameState());
}

function emptyState() {
    const state = newState();
    state.board = Array(8).fill().map(() => Array(8).fill(null));
    return state;
}

function put(state, x, y, player, identity) {
    state.board[y][x] = new Piece(player, identity);
    return state.board[y][x];
}

test('creates an 8x8 initial board with three pieces per player', () => {
    const state = newState();
    const playerOnePieces = state.board.flat().filter(piece => piece && piece.player === 1);
    const playerTwoPieces = state.board.flat().filter(piece => piece && piece.player === 2);

    assert.equal(state.board.length, 8);
    assert.ok(state.board.every(row => row.length === 8));
    assert.equal(playerOnePieces.length, 3);
    assert.equal(playerTwoPieces.length, 3);
    assert.deepEqual(new Set(playerOnePieces.map(piece => piece.identity)), new Set(['red', 'green', 'blue']));
    assert.deepEqual(new Set(playerTwoPieces.map(piece => piece.identity)), new Set(['red', 'green', 'blue']));
});

test('starts with Player 1 and three action points', () => {
    const state = newState();

    assert.equal(state.currentPlayer, 1);
    assert.equal(state.actionPoints, 3);
});

test('allows valid orthogonal movement and deducts one AP', () => {
    const state = emptyState();
    const piece = put(state, 1, 1, 1, 'red');

    assert.equal(state.isValidMove(1, 1, 2, 1), true);
    assert.equal(state.move(1, 1, 2, 1), true);
    assert.equal(state.board[1][1], null);
    assert.equal(state.board[1][2], piece);
    assert.equal(state.actionPoints, 2);
});

test('rejects diagonal and non-adjacent movement', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');

    assert.equal(state.isValidMove(1, 1, 2, 2), false);
    assert.equal(state.isValidMove(1, 1, 3, 1), false);
    assert.equal(state.move(1, 1, 2, 2), false);
    assert.equal(state.move(1, 1, 3, 1), false);
    assert.equal(state.actionPoints, 3);
});

test("rejects moving an opponent's piece", () => {
    const state = emptyState();
    put(state, 1, 1, 2, 'red');

    assert.equal(state.isValidMove(1, 1, 2, 1), false);
    assert.equal(state.move(1, 1, 2, 1), false);
});

test('rejects moving onto a friendly piece', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 1, 'blue');

    assert.equal(state.isValidMove(1, 1, 2, 1), false);
    assert.equal(state.move(1, 1, 2, 1), false);
});

test('changes player and resets AP when movement reaches zero AP', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    state.actionPoints = 1;

    assert.equal(state.move(1, 1, 2, 1), true);
    assert.equal(state.currentPlayer, 2);
    assert.equal(state.actionPoints, 3);
});

test('resolves every non-equal Rock/Paper/Scissors combat outcome', () => {
    const outcomes = [
        ['red', 'green', 1],
        ['green', 'blue', 1],
        ['blue', 'red', 1],
        ['green', 'red', -1],
        ['blue', 'green', -1],
        ['red', 'blue', -1],
    ];

    for (const [attacker, defender, expected] of outcomes) {
        const state = emptyState();
        const attackingPiece = put(state, 1, 1, 1, attacker);
        const defendingPiece = put(state, 2, 1, 2, defender);

        assert.equal(state.resolveAttack(attacker, defender), expected);
        assert.equal(state.move(1, 1, 2, 1), true);
        assert.equal(attackingPiece.revealed, true);
        assert.equal(defendingPiece.revealed, true);
        if (expected > 0) {
            assert.equal(state.board[1][2], attackingPiece);
            assert.equal(state.board[1][1], null);
        } else {
            assert.equal(state.board[1][2], defendingPiece);
            assert.equal(state.board[1][1], null);
        }
    }
});

test('equal-identity combat leaves both pieces in place and reveals them', () => {
    const state = emptyState();
    const attackingPiece = put(state, 1, 1, 1, 'red');
    const defendingPiece = put(state, 2, 1, 2, 'red');

    assert.equal(state.resolveAttack('red', 'red'), 0);
    assert.equal(state.move(1, 1, 2, 1), true);
    assert.equal(state.board[1][1], attackingPiece);
    assert.equal(state.board[1][2], defendingPiece);
    assert.equal(attackingPiece.revealed, true);
    assert.equal(defendingPiece.revealed, true);
    assert.equal(state.actionPoints, 2);
});

test('ends Player 1 turn when a losing attack removes their last piece', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 2, 'blue');
    state.actionPoints = 2;

    assert.equal(state.move(1, 1, 2, 1), true);
    assert.equal(state.board[1][1], null);
    assert.equal(state.countPlayerPieces(1), 0);
    assert.equal(state.currentPlayer, 2);
    assert.equal(state.actionPoints, 3);
});

test('ends Player 2 turn when a losing attack removes their last piece', () => {
    const state = emptyState();
    state.currentPlayer = 2;
    put(state, 6, 6, 2, 'red');
    put(state, 5, 6, 1, 'blue');
    state.actionPoints = 2;

    assert.equal(state.move(6, 6, 5, 6), true);
    assert.equal(state.board[6][6], null);
    assert.equal(state.countPlayerPieces(2), 0);
    assert.equal(state.currentPlayer, 1);
    assert.equal(state.actionPoints, 3);
});

test('does not end the turn early when a losing attack leaves another piece', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 3, 3, 1, 'green');
    put(state, 2, 1, 2, 'blue');
    state.actionPoints = 2;

    assert.equal(state.move(1, 1, 2, 1), true);
    assert.equal(state.countPlayerPieces(1), 1);
    assert.equal(state.currentPlayer, 1);
    assert.equal(state.actionPoints, 1);
});

test('allows redeployment only for an owned piece with at least 2 AP', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 2, 'blue');

    assert.equal(state.canRedeploy(1, 1), true);
    assert.equal(state.canRedeploy(2, 1), false);
    assert.equal(state.canRedeploy(3, 3), null);
    state.actionPoints = 1;
    assert.equal(state.canRedeploy(1, 1), false);
});

test('redeployment changes identity, hides the piece, and costs 2 AP', () => {
    const state = emptyState();
    const piece = put(state, 1, 1, 1, 'red');
    piece.reveal();

    assert.equal(state.redeploy(1, 1, 'blue'), true);
    assert.equal(piece.identity, 'blue');
    assert.equal(piece.revealed, false);
    assert.equal(state.actionPoints, 1);
    assert.equal(state.currentPlayer, 1);
});

test('allows respawn only with exactly 3 AP, an empty home, and fewer than 3 pieces', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 1, 'green');

    assert.equal(state.canRespawn(), true);
    put(state, 0, 0, 1, 'blue');
    assert.equal(state.canRespawn(), false);
    state.board[0][0] = null;
    state.actionPoints = 2;
    assert.equal(state.canRespawn(), false);

    state.actionPoints = 3;
    put(state, 3, 1, 1, 'blue');
    assert.equal(state.canRespawn(), false);
});

test('respawn places a piece, consumes AP, and transitions the turn', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 1, 'green');

    assert.equal(state.respawn('blue'), true);
    assert.equal(state.board[0][0].player, 1);
    assert.equal(state.board[0][0].identity, 'blue');
    assert.equal(state.actionPoints, 3);
    assert.equal(state.currentPlayer, 2);
});

test('reports victory when Player 1 reaches Player 2 home', () => {
    const state = emptyState();
    put(state, 6, 7, 1, 'red');
    state.actionPoints = 2;

    assert.equal(state.move(6, 7, 7, 7), 'win');
    assert.equal(state.board[7][7].player, 1);
});

test('starts as a non-terminal state without a winner', () => {
    const state = newState();

    assert.equal(state.isTerminal(), false);
    assert.equal(state.winner, null);
});

test('records the winner and becomes terminal after a winning move', () => {
    const state = emptyState();
    put(state, 6, 7, 1, 'red');
    state.actionPoints = 2;

    const result = applyGameAction(state, createMoveAction(6, 7, 7, 7));

    assert.equal(result, 'win');
    assert.equal(state.isTerminal(), true);
    assert.equal(state.winner, 1);
    assert.deepEqual(legalActions(state), []);
});

test('keeps terminal state and winner queryable after the winning action', () => {
    const state = emptyState();
    put(state, 6, 7, 1, 'red');
    state.actionPoints = 2;

    state.move(6, 7, 7, 7);

    assert.equal(state.isTerminal(), true);
    assert.equal(state.winner, 1);
});
