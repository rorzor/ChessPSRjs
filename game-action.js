const IDENTITIES = ['red', 'green', 'blue'];
const IDENTITY_SET = new Set(IDENTITIES);

function createMoveAction(fromX, fromY, toX, toY) {
    return {
        type: 'move',
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY },
    };
}

function createRedeployAction(x, y, identity) {
    return {
        type: 'redeploy',
        at: { x, y },
        identity,
    };
}

function createRespawnAction(identity) {
    return {
        type: 'respawn',
        identity,
    };
}

function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function isCoordinate(value) {
    return isPlainObject(value) &&
           Object.keys(value).length === 2 &&
           Number.isInteger(value.x) &&
           Number.isInteger(value.y);
}

function isIdentity(value) {
    return typeof value === 'string' && IDENTITY_SET.has(value);
}

function isGameAction(action) {
    if (!isPlainObject(action) || typeof action.type !== 'string') return false;

    if (action.type === 'move') {
        return Object.keys(action).length === 3 &&
               isCoordinate(action.from) &&
               isCoordinate(action.to);
    }

    if (action.type === 'redeploy') {
        return Object.keys(action).length === 3 &&
               isCoordinate(action.at) &&
               isIdentity(action.identity);
    }

    return action.type === 'respawn' &&
           Object.keys(action).length === 2 &&
           isIdentity(action.identity);
}

function legalActions(gameState) {
    if (gameState.isTerminal()) return [];

    const actions = [];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            for (const [dx, dy] of directions) {
                const toX = x + dx;
                const toY = y + dy;
                if (gameState.isValidMove(x, y, toX, toY)) {
                    actions.push(createMoveAction(x, y, toX, toY));
                }
            }

            if (gameState.canRedeploy(x, y)) {
                for (const identity of IDENTITIES) {
                    actions.push(createRedeployAction(x, y, identity));
                }
            }
        }
    }

    if (gameState.canRespawn()) {
        for (const identity of IDENTITIES) {
            actions.push(createRespawnAction(identity));
        }
    }

    return actions;
}

function applyGameAction(gameState, action) {
    if (!isGameAction(action)) {
        throw new TypeError('Invalid GameAction');
    }

    switch (action.type) {
        case 'move':
            return gameState.move(
                action.from.x,
                action.from.y,
                action.to.x,
                action.to.y,
            );
        case 'redeploy':
            return gameState.redeploy(action.at.x, action.at.y, action.identity);
        case 'respawn':
            return gameState.respawn(action.identity);
        default:
            throw new TypeError(`Unknown GameAction type: ${action.type}`);
    }
}

const GameAction = Object.freeze({
    move: createMoveAction,
    redeploy: createRedeployAction,
    respawn: createRespawnAction,
});

if (typeof module !== 'undefined') {
    module.exports = {
        GameAction,
        createMoveAction,
        createRedeployAction,
        createRespawnAction,
        applyGameAction,
        legalActions,
        isGameAction,
    };
}
