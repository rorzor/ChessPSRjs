const test = require('node:test');
const assert = require('node:assert/strict');
const {
    GameAction,
    createMoveAction,
    createRedeployAction,
    createRespawnAction,
    applyGameAction,
    legalActions,
    isGameAction,
} = require('../game-action.js');
const { GameState, Piece } = require('../game-state.js');

function emptyState() {
    const state = new GameState();
    state.board = Array(8).fill().map(() => Array(8).fill(null));
    return state;
}

function put(state, x, y, player, identity) {
    state.board[y][x] = new Piece(player, identity);
    return state.board[y][x];
}

function cloneState(state) {
    const clone = emptyState();
    clone.currentPlayer = state.currentPlayer;
    clone.actionPoints = state.actionPoints;
    clone.peekingAll = state.peekingAll;
    state.board.forEach((row, y) => row.forEach((piece, x) => {
        if (piece) {
            clone.board[y][x] = new Piece(piece.player, piece.identity);
            clone.board[y][x].revealed = piece.revealed;
        }
    }));
    return clone;
}

test('creates a serializable move action from source and destination coordinates', () => {
    const action = createMoveAction(1, 2, 1, 3);

    assert.deepEqual(action, {
        type: 'move',
        from: { x: 1, y: 2 },
        to: { x: 1, y: 3 },
    });
    assert.deepEqual(JSON.parse(JSON.stringify(action)), action);
    assert.equal(isGameAction(action), true);
});

test('creates a serializable redeploy action with a square and identity', () => {
    const action = createRedeployAction(4, 5, 'blue');

    assert.deepEqual(action, {
        type: 'redeploy',
        at: { x: 4, y: 5 },
        identity: 'blue',
    });
    assert.equal(isGameAction(action), true);
});

test('creates a serializable respawn action with an identity', () => {
    const action = createRespawnAction('green');

    assert.deepEqual(action, {
        type: 'respawn',
        identity: 'green',
    });
    assert.equal(isGameAction(action), true);
});

test('exposes the action factories through the GameAction namespace', () => {
    assert.deepEqual(GameAction.move(0, 1, 0, 2), createMoveAction(0, 1, 0, 2));
    assert.deepEqual(GameAction.redeploy(2, 3, 'red'), createRedeployAction(2, 3, 'red'));
    assert.deepEqual(GameAction.respawn('blue'), createRespawnAction('blue'));
});

test('does not treat UI objects or malformed data as game actions', () => {
    assert.equal(isGameAction({ type: 'move', from: {}, to: {} }), false);
    assert.equal(isGameAction({ type: 'click', event: {} }), false);
    assert.equal(isGameAction(null), false);
});

test('dispatches a move action to GameState.move and preserves its result', () => {
    const state = emptyState();
    const piece = put(state, 1, 1, 1, 'red');

    const result = applyGameAction(state, createMoveAction(1, 1, 2, 1));

    assert.equal(result, true);
    assert.equal(state.board[1][1], null);
    assert.equal(state.board[1][2], piece);
    assert.equal(state.actionPoints, 2);
});

test('dispatches a redeploy action with the same result as GameState.redeploy', () => {
    const state = emptyState();
    const directState = emptyState();
    const piece = put(state, 1, 1, 1, 'red');
    const directPiece = put(directState, 1, 1, 1, 'red');
    piece.reveal();
    directPiece.reveal();

    const actionResult = applyGameAction(state, createRedeployAction(1, 1, 'blue'));
    const directResult = directState.redeploy(1, 1, 'blue');

    assert.equal(actionResult, directResult);
    assert.deepEqual(state, directState);
});

test('dispatches a respawn action with the same result as GameState.respawn', () => {
    const state = emptyState();
    const directState = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 1, 'green');
    put(directState, 1, 1, 1, 'red');
    put(directState, 2, 1, 1, 'green');

    const actionResult = applyGameAction(state, createRespawnAction('blue'));
    const directResult = directState.respawn('blue');

    assert.equal(actionResult, directResult);
    assert.deepEqual(state, directState);
});

test('rejects malformed and unknown actions before dispatch', () => {
    const state = emptyState();

    assert.throws(
        () => applyGameAction(state, { type: 'move', from: {}, to: {} }),
        TypeError,
    );
    assert.throws(
        () => applyGameAction(state, { type: 'endTurn' }),
        TypeError,
    );
});

test('returns legal orthogonal moves and excludes illegal destinations', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 2, 'green');
    put(state, 1, 2, 1, 'blue');
    put(state, 3, 3, 2, 'red');

    const actions = legalActions(state);

    assert.deepEqual(actions.filter(action => action.type === 'move' &&
        action.from.x === 1 && action.from.y === 1), [
        createMoveAction(1, 1, 2, 1),
        createMoveAction(1, 1, 0, 1),
        createMoveAction(1, 1, 1, 0),
    ]);
    assert.equal(actions.some(action => action.type === 'move' &&
        action.from.x === 3 && action.from.y === 3), false);
    assert.equal(actions.some(action => action.type === 'move' &&
        action.to.x === 1 && action.to.y === 2), false);
});

test('returns redeploy actions only for owned pieces and every identity', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 2, 'green');
    state.actionPoints = 2;

    const actions = legalActions(state).filter(action => action.type === 'redeploy');

    assert.deepEqual(actions, [
        createRedeployAction(1, 1, 'red'),
        createRedeployAction(1, 1, 'green'),
        createRedeployAction(1, 1, 'blue'),
    ]);
});

test('returns respawn actions only when respawning is legal and for every identity', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 1, 'green');

    assert.deepEqual(legalActions(state).filter(action => action.type === 'respawn'), [
        createRespawnAction('red'),
        createRespawnAction('green'),
        createRespawnAction('blue'),
    ]);

    state.actionPoints = 2;
    assert.equal(legalActions(state).some(action => action.type === 'respawn'), false);
});

test('does not mutate state and returns only valid actions applicable to equivalent states', () => {
    const state = emptyState();
    put(state, 1, 1, 1, 'red');
    put(state, 2, 1, 2, 'green');
    state.actionPoints = 2;
    const before = JSON.stringify(state);

    const actions = legalActions(state);

    assert.equal(JSON.stringify(state), before);
    assert.ok(actions.length > 0);
    actions.forEach(action => {
        assert.equal(isGameAction(action), true);
        assert.doesNotThrow(() => applyGameAction(cloneState(state), action));
    });
});
