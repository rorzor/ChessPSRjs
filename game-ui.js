class GameUI {
    constructor(gameState, container) {
        this.gameState = gameState;
        this.container = container;
        this.selectedPiece = null;
        this.redeployMode = false;
        this.createBoard();
        this.createActionButtons();
        this.updateBoard();
    }
    /**
     * This method creates the game board UI.
     * It generates an 8x8 grid of squares, each represented by a div element
     * with data attributes for its coordinates. Each square can be clicked to
     * select a piece or perform an action.
     */
    createBoard() {      
        const board = document.createElement('div');
        board.className = 'board';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const square = document.createElement('div');
                square.className = 'square';
                square.dataset.x = x;
                square.dataset.y = y;
                square.addEventListener('click', () => this.handleSquareClick(x, y));
                board.appendChild(square);
            }
        }
        this.container.appendChild(board);
    }

    /*** This method creates the action buttons for the game.
     * It includes buttons for redeploying pieces, peeking at a piece's identity,
     * and buttons for each player's identity colors (red, green, blue).
     * The buttons are added to an action bar at the bottom of the game UI.
     */
    createActionButtons() {
        const actionBar = document.createElement('div');
        actionBar.className = 'action-bar';

        this.redeployButton = document.createElement('button');
        this.redeployButton.textContent = 'Redeploy';
        this.redeployButton.addEventListener('click', () => this.handleRedeployClick());
        actionBar.appendChild(this.redeployButton);

        this.peekButton = document.createElement('button');
        this.peekButton.textContent = 'Peek';
        this.peekButton.addEventListener('mousedown', () => this.handlePeekStart());
        this.peekButton.addEventListener('mouseup', () => this.handlePeekEnd());
        this.peekButton.addEventListener('mouseleave', () => this.handlePeekEnd());
        actionBar.appendChild(this.peekButton);

        this.identityButtons = ['red', 'green', 'blue'].map(identity => {
            const button = document.createElement('button');
            button.textContent = identity;
            button.style.display = 'none';
            button.addEventListener('click', () => this.handleIdentityClick(identity));
            actionBar.appendChild(button);
            return button;
        });

        this.container.appendChild(actionBar);
    }

    /** * This method updates the game board UI based on the current game state.
     * It iterates through each square on the board, checking the game state
     * to determine if a piece is present, its player, and whether it has been revealed.
     * It also highlights valid moves for the selected piece and updates the action points display.
     * If a piece is selected, it shows valid moves for that piece.
     * If a piece is peeked at, it reveals its identity.
     */
    updateBoard() {
        const squares = this.container.querySelectorAll('.square');
        squares.forEach(square => {
            const x = parseInt(square.dataset.x);
            const y = parseInt(square.dataset.y);
            const piece = this.gameState.board[y][x];

            square.textContent = '';
            square.className = 'square';
            if (piece) {
                square.textContent = piece.player;
                square.classList.add(`player${piece.player}`);
                if (piece.revealed || piece === this.gameState.peekedPiece) {
                    square.classList.add(piece.identity);
                }
            }

            if (this.selectedPiece) {
                const [selectedX, selectedY] = this.selectedPiece;
                if (this.gameState.isValidMove(selectedX, selectedY, x, y)) {
                    square.classList.add('valid-move');
                }
            }
        });

        this.redeployButton.disabled = !this.selectedPiece || !this.gameState.canRedeploy(...this.selectedPiece);
        this.peekButton.disabled = !this.selectedPiece;
        this.updateActionPoints();
    }
    /** * This method handles the start of a peek action.
     * It checks if a piece is selected and if it can be peeked at.
     * If so, it updates the board to show the piece's identity.
     */
    handlePeekStart() {
        if (this.selectedPiece) {
            const [x, y] = this.selectedPiece;
            if (this.gameState.peek(x, y)) {
                this.updateBoard();
            }
        }
    }
    /** * This method handles the end of a peek action.
     * It resets the peeked piece and updates the board.
     */
    handlePeekEnd() {
        this.gameState.endPeek();
        this.updateBoard();
    }
    /** * This method updates the action points display in the UI.
     * It retrieves the action points element and updates its text content
     * to reflect the current player's turn and available action points.
     */
    updateActionPoints() {
        const actionPointsDisplay = document.getElementById('action-points');
        if (actionPointsDisplay) {
            actionPointsDisplay.textContent = `Player ${this.gameState.currentPlayer}'s turn - Action Points: ${this.gameState.actionPoints}`;
        }
    }
    /** * This method handles the click event on a square in the game board.
     * If a piece is selected, it attempts to move that piece to the clicked square.
     * If the move is valid and results in a win, it alerts the winning player.
     * If no piece is selected, it checks if the clicked square contains a piece belonging to
     * the current player and selects it. If the clicked square is a respawn square,
     * it shows identity buttons for respawning.
     */
    handleSquareClick(x, y) {
        if (this.selectedPiece) {
            const [fromX, fromY] = this.selectedPiece;
            const result = this.gameState.move(fromX, fromY, x, y);
            if (result === 'win') {
                alert(`Player ${this.gameState.currentPlayer} wins!`);
            }
            this.selectedPiece = null;
        } else if (this.gameState.board[y][x] && this.gameState.board[y][x].player === this.gameState.currentPlayer) {
            this.selectedPiece = [x, y];
        } else if (this.gameState.canRespawn() && ((x === 0 && y === 0 && this.gameState.currentPlayer === 1) || (x === 7 && y === 7 && this.gameState.currentPlayer === 2))) {
            this.showIdentityButtons('respawn');
        }
        this.updateBoard();
    }

    /** * This method handles the click event on the redeploy button.
     * It checks if a piece is selected and if it can be redeployed.
     * If so, it enters redeploy mode and shows identity buttons for redeployment.
     */
    handleRedeployClick() {
        if (this.selectedPiece && this.gameState.canRedeploy(...this.selectedPiece)) {
            this.redeployMode = true;
            this.showIdentityButtons('redeploy');
        }
    }

    /** * This method shows identity buttons for redeployment or respawning.
     * It hides the redeploy button and displays buttons for each player's identity colors. 
     * Each button, when clicked, will handle the redeployment or respawning of a piece based on the selected identity.
     */
    showIdentityButtons(action) {
        this.redeployButton.style.display = 'none';
        this.identityButtons.forEach(button => {
            button.style.display = 'inline-block';
            button.onclick = () => this.handleIdentityClick(button.textContent, action);
        });
    }
    /** * This method handles the click event on an identity button.
     * It checks if the action is redeployment or respawning and performs the corresponding action.
     * If redeploying, it checks if a piece is selected and if it can be redeployed to the selected square.
     * If respawning, it respawns the piece with the selected identity.
     */
    handleIdentityClick(identity, action) {
        if (action === 'redeploy' && this.selectedPiece && this.redeployMode) {
            const [x, y] = this.selectedPiece;
            if (this.gameState.redeploy(x, y, identity)) {
                this.redeployMode = false;
                this.selectedPiece = null;
            }
        } else if (action === 'respawn') {
            this.gameState.respawn(identity);
        }
        this.hideIdentityButtons();
        this.updateBoard();
    }
    /** * This method hides the identity buttons and shows the redeploy button.
     * It is called after a redeployment or respawning action is completed.
     */
    hideIdentityButtons() {
        this.redeployButton.style.display = 'inline-block';
        this.identityButtons.forEach(button => {
            button.style.display = 'none';
        });
    }
}
