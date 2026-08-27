const test = require('node:test');
const assert = require('node:assert/strict');
const { GameState, Piece } = require('../game-state.js');
const {
    createMoveAction,
    createRedeployAction,
} = require('../game-action.js');
const { AggressiveHeuristicAgent } = require('../aggressive-agent.js');

function emptyState() {
    const state = new GameState();
    state.board = Array(8).fill().map(() => Array(8).fill(null));
    return state;
}

function put(state, x, y, player, identity) {
    state.board[y][x] = new Piece(player, identity);
}

test('chooses a winning move when one is available', () => {
    const state = emptyState();
    put(state, 6, 7, 1, 'red');
    const winningMove = createMoveAction(6, 7, 7, 7);
    const actions = [
        createMoveAction(6, 7, 6, 6),
        winningMove,
    ];

    assert.deepEqual(new AggressiveHeuristicAgent().chooseAction(state, actions), winningMove);
});

test('chooses only from supplied legal actions', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    const actions = [
        createMoveAction(1, 1, 2, 1),
        createRedeployAction(1, 1, 'blue'),
    ];

    assert.equal(actions.includes(new AggressiveHeuristicAgent().chooseAction(state, actions)), true);
});

test('breaks tied scores deterministically using supplied order', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    const firstAction = createRedeployAction(1, 1, 'red');
    const secondAction = createRedeployAction(1, 1, 'green');

    assert.deepEqual(
        new AggressiveHeuristicAgent().chooseAction(state, [firstAction, secondAction]),
        firstAction,
    );
});
