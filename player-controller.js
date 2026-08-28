const actionApi = typeof module !== 'undefined' && module.exports
    ? require('./game-action.js')
    : { legalActions, applyGameAction, isGameAction };
const agentClasses = typeof module !== 'undefined' && module.exports
    ? {
        RandomAgent: require('./random-agent.js').RandomAgent,
        AggressiveHeuristicAgent: require('./aggressive-agent.js').AggressiveHeuristicAgent,
    }
    : { RandomAgent, AggressiveHeuristicAgent };

const CONTROLLER_TYPES = Object.freeze({
    HUMAN: 'human',
    RANDOM: 'random',
    AGGRESSIVE: 'aggressive',
});

const defaultAgentFactories = {
    random: () => new agentClasses.RandomAgent(),
    aggressive: () => new agentClasses.AggressiveHeuristicAgent(),
};

function actionsMatch(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
}

class PlayerController {
    constructor(gameState, controllers = {}, options = {}) {
        this.gameState = gameState;
        this.controllers = {
            1: controllers[1] || CONTROLLER_TYPES.HUMAN,
            2: controllers[2] || CONTROLLER_TYPES.HUMAN,
        };
        this.agentFactories = {
            ...defaultAgentFactories,
            ...(options.agentFactories || {}),
        };
        this.delay = options.delay === undefined ? 500 : options.delay;
        this.schedule = options.schedule || ((callback, delay) => setTimeout(callback, delay));
        this.cancel = options.cancel || (timer => clearTimeout(timer));
        this.onUpdate = options.onUpdate || (() => {});
        this.timer = null;
        this.agents = {};
    }

    setGameState(gameState) {
        this.stop();
        this.gameState = gameState;
        this.agents = {};
    }

    setControllers(controllers = {}) {
        this.stop();
        this.controllers = {
            1: controllers[1] || CONTROLLER_TYPES.HUMAN,
            2: controllers[2] || CONTROLLER_TYPES.HUMAN,
        };
        this.agents = {};
    }

    controllerFor(player) {
        return this.controllers[player];
    }

    isHumanControlled(player = this.gameState.currentPlayer) {
        return this.controllerFor(player) === CONTROLLER_TYPES.HUMAN;
    }

    agentFor(player) {
        const controller = this.controllerFor(player);
        if (this.isHumanControlled(player)) return null;
        if (!this.agentFactories[controller]) {
            throw new TypeError(`Unknown controller type: ${controller}`);
        }
        if (!this.agents[player]) {
            this.agents[player] = this.agentFactories[controller]();
        }
        return this.agents[player];
    }

    applyHumanAction(action) {
        if (this.gameState.isTerminal() || !this.isHumanControlled()) return false;
        const result = actionApi.applyGameAction(this.gameState, action);
        this.onUpdate(result, action);
        this.scheduleCpuTurn();
        return result;
    }

    playCpuTurn() {
        if (this.gameState.isTerminal() || this.isHumanControlled()) return false;

        const availableActions = actionApi.legalActions(this.gameState);
        if (availableActions.length === 0) return false;

        const action = this.agentFor(this.gameState.currentPlayer)
            .chooseAction(this.gameState, availableActions);
        if (!actionApi.isGameAction(action) ||
            !availableActions.some(candidate => actionsMatch(candidate, action))) {
            throw new TypeError('CPU returned an action that is not legal');
        }

        const result = actionApi.applyGameAction(this.gameState, action);
        this.onUpdate(result, action);
        this.scheduleCpuTurn();
        return true;
    }

    scheduleCpuTurn() {
        if (this.gameState.isTerminal() || this.isHumanControlled() || this.timer !== null) {
            return false;
        }

        this.timer = this.schedule(() => {
            this.timer = null;
            this.playCpuTurn();
        }, this.delay);
        return true;
    }

    stop() {
        if (this.timer !== null) {
            this.cancel(this.timer);
            this.timer = null;
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = { CONTROLLER_TYPES, PlayerController };
}
