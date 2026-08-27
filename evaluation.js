const { runMatch } = require('./match-runner.js');

function evaluateAgents({
    agent1,
    agent2,
    games = 1,
    maxActions = 1000,
    gameStateFactory,
} = {}) {
    if (!Number.isInteger(games) || games < 0) {
        throw new RangeError('games must be a non-negative integer');
    }
    if (gameStateFactory !== undefined && typeof gameStateFactory !== 'function') {
        throw new TypeError('gameStateFactory must be a function');
    }

    let player1Wins = 0;
    let player2Wins = 0;
    let actionLimitTerminations = 0;
    let noLegalActionTerminations = 0;
    let totalActions = 0;

    for (let game = 0; game < games; game++) {
        const result = runMatch({
            player1Agent: agent1,
            player2Agent: agent2,
            maxActions,
            ...(gameStateFactory ? { gameState: gameStateFactory(game) } : {}),
        });

        if (result.winner === 1) player1Wins++;
        if (result.winner === 2) player2Wins++;
        if (result.terminationReason === 'action-limit') actionLimitTerminations++;
        if (result.terminationReason === 'no-legal-actions') noLegalActionTerminations++;
        totalActions += result.actionsTaken;
    }

    return {
        games,
        player1Wins,
        player2Wins,
        actionLimitTerminations,
        noLegalActionTerminations,
        averageActions: games === 0 ? 0 : totalActions / games,
    };
}

if (typeof module !== 'undefined') {
    module.exports = { evaluateAgents };
}
