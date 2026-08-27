const { GameState } = require('./game-state.js');
const {
    applyGameAction,
    isGameAction,
    legalActions,
} = require('./game-action.js');

function actionsMatch(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
}

function matchResult(gameState, actionsTaken, terminationReason) {
    return {
        winner: gameState.winner,
        actionsTaken,
        terminationReason,
        gameState,
    };
}

function runMatch({
    player1Agent,
    player2Agent,
    gameState = new GameState(),
    maxActions = 1000,
} = {}) {
    if (!player1Agent || typeof player1Agent.chooseAction !== 'function' ||
        !player2Agent || typeof player2Agent.chooseAction !== 'function') {
        throw new TypeError('Both players must provide chooseAction()');
    }
    if (!Number.isInteger(maxActions) || maxActions < 0) {
        throw new RangeError('maxActions must be a non-negative integer');
    }

    let actionsTaken = 0;
    while (!gameState.isTerminal()) {
        if (actionsTaken >= maxActions) {
            return matchResult(gameState, actionsTaken, 'action-limit');
        }

        const availableActions = legalActions(gameState);
        if (availableActions.length === 0) {
            return matchResult(gameState, actionsTaken, 'no-legal-actions');
        }

        const agent = gameState.currentPlayer === 1 ? player1Agent : player2Agent;
        const action = agent.chooseAction(gameState, availableActions);
        if (!isGameAction(action) ||
            !availableActions.some(candidate => actionsMatch(candidate, action))) {
            throw new TypeError('Agent returned an action that is not legal');
        }

        applyGameAction(gameState, action);
        actionsTaken++;
    }

    return matchResult(gameState, actionsTaken, 'victory');
}

if (typeof module !== 'undefined') {
    module.exports = { runMatch };
}
