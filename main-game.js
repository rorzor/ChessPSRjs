// Create the game state
const gameState = new GameState();

// Create the game UI
const container = document.getElementById('game-container');
const gameUI = new GameUI(gameState, container);

// Create action points display
const actionPointsDisplay = document.createElement('div');
actionPointsDisplay.id = 'action-points';
container.insertBefore(actionPointsDisplay, container.firstChild);

// Initial update
gameUI.updateBoard();
