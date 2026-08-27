const test = require('node:test');
const assert = require('node:assert/strict');
const { GameState, Piece } = require('../game-state.js');
const { RandomAgent } = require('../random-agent.js');
const { AggressiveHeuristicAgent } = require('../aggressive-agent.js');
const { evaluateAgents } = require('../evaluation.js');

function emptyState() {
    const state = new GameState();
    state.board = Array(8).fill().map(() => Array(8).fill(null));
    return state;
}

function winningState() {
    const state = emptyState();
    state.board[7][6] = new Piece(1, 'red');
    state.actionPoints = 2;
    return state;
}

test('evaluates exactly the requested number of games', () => {
    const result = evaluateAgents({
        agent1: new RandomAgent(() => 0),
        agent2: new RandomAgent(() => 0),
        games: 3,
        maxActions: 0,
    });

    assert.equal(result.games, 3);
    assert.equal(result.actionLimitTerminations, 3);
    assert.equal(result.averageActions, 0);
});

test('aggregates victories and action counts from runMatch results', () => {
    const result = evaluateAgents({
        agent1: new AggressiveHeuristicAgent(),
        agent2: new RandomAgent(() => 0),
        games: 2,
        maxActions: 5,
        gameStateFactory: winningState,
    });

    assert.equal(result.games, 2);
    assert.equal(result.player1Wins, 2);
    assert.equal(result.player2Wins, 0);
    assert.equal(result.actionLimitTerminations, 0);
    assert.equal(result.noLegalActionTerminations, 0);
    assert.equal(result.averageActions, 1);
});

test('aggregates non-terminal no-legal-action terminations', () => {
    const result = evaluateAgents({
        agent1: new RandomAgent(() => 0),
        agent2: new RandomAgent(() => 0),
        games: 2,
        maxActions: 5,
        gameStateFactory: () => {
            const state = emptyState();
            state.actionPoints = 2;
            return state;
        },
    });

    assert.equal(result.games, 2);
    assert.equal(result.player1Wins, 0);
    assert.equal(result.player2Wins, 0);
    assert.equal(result.actionLimitTerminations, 0);
    assert.equal(result.noLegalActionTerminations, 2);
    assert.equal(result.averageActions, 0);
});

test('supports evaluating both player positions', () => {
    const player1Aggressive = evaluateAgents({
        agent1: new AggressiveHeuristicAgent(),
        agent2: new RandomAgent(() => 0),
        games: 2,
        maxActions: 0,
    });
    const player2Aggressive = evaluateAgents({
        agent1: new RandomAgent(() => 0),
        agent2: new AggressiveHeuristicAgent(),
        games: 2,
        maxActions: 0,
    });

    assert.equal(player1Aggressive.games, 2);
    assert.equal(player2Aggressive.games, 2);
    assert.equal(player1Aggressive.actionLimitTerminations, 2);
    assert.equal(player2Aggressive.actionLimitTerminations, 2);
});
