const test = require('node:test');
const assert = require('node:assert/strict');
const { createMoveAction, createRedeployAction } = require('../game-action.js');
const { Agent } = require('../agent.js');
const { RandomAgent } = require('../random-agent.js');

test('Agent defines the minimal chooseAction interface', () => {
    assert.throws(() => new Agent().chooseAction({}, []), Error);
});

test('RandomAgent chooses one of the supplied legal actions', () => {
    const actions = [createMoveAction(0, 0, 1, 0), createRedeployAction(1, 1, 'blue')];
    const agent = new RandomAgent(() => 0.99);

    assert.equal(actions.includes(agent.chooseAction({}, actions)), true);
});

test('RandomAgent supports deterministic injected randomness', () => {
    const actions = [
        createMoveAction(0, 0, 1, 0),
        createRedeployAction(1, 1, 'blue'),
    ];

    assert.deepEqual(new RandomAgent(() => 0).chooseAction({}, actions), actions[0]);
    assert.deepEqual(new RandomAgent(() => 0.99).chooseAction({}, actions), actions[1]);
});

test('RandomAgent rejects an empty legal-action list', () => {
    assert.throws(() => new RandomAgent(() => 0).chooseAction({}, []), RangeError);
});
