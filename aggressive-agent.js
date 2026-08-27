const { Agent } = require('./agent.js');

// Scores are intentionally separated so the heuristic remains interpretable.
const WINNING_MOVE_SCORE = 100000;
const ATTACK_SCORE = 1000;
const DISTANCE_PROGRESS_SCORE = 20;
const FORWARD_PROGRESS_SCORE = 2;
const RESPAWN_SCORE = 10;
const REDEPLOY_SCORE = 1;

function opponentHome(player) {
    return player === 1 ? { x: 7, y: 7 } : { x: 0, y: 0 };
}

function distanceToHome(square, home) {
    return Math.abs(square.x - home.x) + Math.abs(square.y - home.y);
}

class AggressiveHeuristicAgent extends Agent {
    chooseAction(gameState, legalActions) {
        if (!Array.isArray(legalActions)) {
            throw new TypeError('legalActions must be an array');
        }
        if (legalActions.length === 0) {
            throw new RangeError('Cannot choose from an empty legal-action list');
        }

        let bestAction = legalActions[0];
        let bestScore = this.scoreAction(gameState, bestAction);
        for (let index = 1; index < legalActions.length; index++) {
            const score = this.scoreAction(gameState, legalActions[index]);
            if (score > bestScore) {
                bestAction = legalActions[index];
                bestScore = score;
            }
        }
        return bestAction;
    }

    scoreAction(gameState, action) {
        if (action.type === 'respawn') return RESPAWN_SCORE;
        if (action.type === 'redeploy') return REDEPLOY_SCORE;
        if (action.type !== 'move') return Number.NEGATIVE_INFINITY;

        const player = gameState.currentPlayer;
        const from = action.from;
        const to = action.to;
        const home = opponentHome(player);
        const target = gameState.board[to.y][to.x];
        let score = 0;

        if (to.x === home.x && to.y === home.y && !target) {
            score += WINNING_MOVE_SCORE;
        }
        if (target && target.player !== player) {
            score += ATTACK_SCORE;
        }

        score += (distanceToHome(from, home) - distanceToHome(to, home)) * DISTANCE_PROGRESS_SCORE;
        const forwardDelta = player === 1
            ? (to.x + to.y) - (from.x + from.y)
            : (from.x + from.y) - (to.x + to.y);
        score += forwardDelta * FORWARD_PROGRESS_SCORE;
        return score;
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        AggressiveHeuristicAgent,
        WINNING_MOVE_SCORE,
        ATTACK_SCORE,
        DISTANCE_PROGRESS_SCORE,
        FORWARD_PROGRESS_SCORE,
        RESPAWN_SCORE,
        REDEPLOY_SCORE,
    };
}
