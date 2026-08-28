const test = require('node:test');
const assert = require('node:assert/strict');
const { GameState, Piece } = require('../game-state.js');
const { legalActions, isGameAction } = require('../game-action.js');
const { PlayerController } = require('../player-controller.js');

function emptyState() {
    const state = new GameState();
    state.board = Array(8).fill().map(() => Array(8).fill(null));
    return state;
}

function put(state, x, y, player, identity) {
    state.board[y][x] = new Piece(player, identity);
}

function testAgent(onChoose) {
    return { chooseAction: onChoose };
}

test('does not invoke an agent during a human-controlled turn', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    let calls = 0;
    const controller = new PlayerController(state, { 1: 'human', 2: 'random' }, {
        agentFactories: { random: () => testAgent(() => { calls++; }) },
    });

    assert.equal(controller.playCpuTurn(), false);
    assert.equal(calls, 0);
});

test('CPU turns receive legal actions and apply the selected canonical action', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    const expectedActions = legalActions(state);
    let receivedActions;
    const controller = new PlayerController(state, { 1: 'random', 2: 'human' }, {
        agentFactories: {
            random: () => testAgent((gameState, actions) => {
                receivedActions = actions;
                assert.equal(gameState, state);
                return actions[0];
            }),
        },
    });

    const result = controller.playCpuTurn();

    assert.equal(result, true);
    assert.deepEqual(receivedActions, expectedActions);
    assert.equal(state.actionPoints, 2);
    assert.ok(receivedActions.every(isGameAction));
});

test('a CPU cannot act when it is not the current player', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    let calls = 0;
    const controller = new PlayerController(state, { 1: 'human', 2: 'random' }, {
        agentFactories: { random: () => testAgent(() => { calls++; }) },
    });

    assert.equal(controller.playCpuTurn(), false);
    assert.equal(calls, 0);
});

test('terminal games do not schedule CPU actions', () => {
    const state = emptyState();
    state.winner = 1;
    let schedules = 0;
    const controller = new PlayerController(state, { 1: 'random', 2: 'random' }, {
        schedule: () => { schedules++; },
    });

    assert.equal(controller.scheduleCpuTurn(), false);
    assert.equal(schedules, 0);
    assert.equal(controller.playCpuTurn(), false);
});

test('CPU scheduling uses the configured delay and continues only for CPU turns', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    let scheduledDelay;
    let callback;
    const controller = new PlayerController(state, { 1: 'random', 2: 'human' }, {
        delay: 25,
        schedule: (fn, delay) => {
            callback = fn;
            scheduledDelay = delay;
            return 1;
        },
        agentFactories: { random: () => testAgent((gameState, actions) => actions[0]) },
    });

    assert.equal(controller.scheduleCpuTurn(), true);
    assert.equal(scheduledDelay, 25);
    callback();
    assert.equal(state.actionPoints, 2);
});
