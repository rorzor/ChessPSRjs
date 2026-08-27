class Agent {
    chooseAction() {
        throw new Error('Agent.chooseAction() must be implemented');
    }
}

if (typeof module !== 'undefined') {
    module.exports = { Agent };
}
