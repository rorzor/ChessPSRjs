const test = require('node:test');
const assert = require('node:assert/strict');
const { GameState, Piece } = require('../game-state.js');
const { createMoveAction, legalActions } = require('../game-action.js');
const { RandomAgent } = require('../random-agent.js');
const { runMatch } = require('../match-runner.js');

function emptyState() {
    const state = new GameState();
    state.board = Array(8).fill().map(() => Array(8).fill(null));
    return state;
}

function put(state, x, y, player, identity) {
    state.board[y][x] = new Piece(player, identity);
}

function firstLegalAgent() {
    return { chooseAction(gameState, actions) {
        assert.equal(actions.length > 0, true);
        assert.deepEqual(actions, legalActions(gameState));
        return actions[0];
    } };
}

test('runs multiple actions through the legal-action and apply boundaries', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    const result = runMatch({
        gameState: state,
        player1Agent: firstLegalAgent(),
        player2Agent: firstLegalAgent(),
        maxActions: 4,
    });

    assert.equal(result.actionsTaken, 4);
    assert.equal(result.terminationReason, 'action-limit');
    assert.equal(result.winner, null);
});

test('returns the correct winner for a winning headless game', () => {
    const state = emptyState();
    put(state, 6, 7, 1, 'red');
    state.actionPoints = 2;
    const agent = new RandomAgent(() => 0);

    const result = runMatch({
        gameState: state,
        player1Agent: agent,
        player2Agent: agent,
        maxActions: 5,
    });

    assert.equal(result.winner, 1);
    assert.equal(result.actionsTaken, 1);
    assert.equal(result.terminationReason, 'victory');
});

test('stops at the configured maximum action count without setting a winner', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');

    const result = runMatch({
        gameState: state,
        player1Agent: firstLegalAgent(),
        player2Agent: firstLegalAgent(),
        maxActions: 2,
    });

    assert.equal(result.actionsTaken, 2);
    assert.equal(result.terminationReason, 'action-limit');
    assert.equal(result.winner, null);
    assert.equal(state.winner, null);
});

test('reports a non-terminal state with no legal actions explicitly', () => {
    const state = emptyState();
    state.actionPoints = 2;

    const result = runMatch({
        gameState: state,
        player1Agent: firstLegalAgent(),
        player2Agent: firstLegalAgent(),
        maxActions: 10,
    });

    assert.equal(result.actionsTaken, 0);
    assert.equal(result.terminationReason, 'no-legal-actions');
    assert.equal(result.winner, null);
});

test('can run a complete RandomAgent versus RandomAgent match headlessly', () => {
    const result = runMatch({
        player1Agent: new RandomAgent(() => 0),
        player2Agent: new RandomAgent(() => 0),
        maxActions: 1000,
    });

    assert.ok(['victory', 'action-limit', 'no-legal-actions'].includes(result.terminationReason));
    assert.ok(result.actionsTaken > 0);
    assert.equal(result.gameState.isTerminal(), result.terminationReason === 'victory');
});

test('returns the final GameState in the match result', () => {
    const state = emptyState();
    put(state, 6, 7, 1, 'red');
    state.actionPoints = 2;

    const result = runMatch({
        gameState: state,
        player1Agent: new RandomAgent(() => 0),
        player2Agent: new RandomAgent(() => 0),
        maxActions: 2,
    });

    assert.equal(result.gameState, state);
});
