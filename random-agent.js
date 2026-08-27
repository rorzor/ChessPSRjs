const { Agent } = require('./agent.js');

class RandomAgent extends Agent {
    constructor(random = Math.random) {
        super();
        if (typeof random !== 'function') {
            throw new TypeError('RandomAgent requires a random function');
        }
        this.random = random;
    }

    chooseAction(gameState, legalActions) {
        if (!Array.isArray(legalActions)) {
            throw new TypeError('legalActions must be an array');
        }
        if (legalActions.length === 0) {
            throw new RangeError('Cannot choose from an empty legal-action list');
        }

        const randomValue = this.random(gameState, legalActions);
        if (typeof randomValue !== 'number' || Number.isNaN(randomValue)) {
            throw new TypeError('RandomAgent randomness must return a number');
        }

        const index = Math.min(
            legalActions.length - 1,
            Math.max(0, Math.floor(randomValue * legalActions.length)),
        );
        return legalActions[index];
    }
}

if (typeof module !== 'undefined') {
    module.exports = { RandomAgent };
}
