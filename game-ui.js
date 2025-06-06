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

    handlePeekStart() {
        if (this.selectedPiece) {
            const [x, y] = this.selectedPiece;
            if (this.gameState.peek(x, y)) {
                this.updateBoard();
            }
        }
    }

    handlePeekEnd() {
        this.gameState.endPeek();
        this.updateBoard();
    }

    updateActionPoints() {
        const actionPointsDisplay = document.getElementById('action-points');
        if (actionPointsDisplay) {
            actionPointsDisplay.textContent = `Player ${this.gameState.currentPlayer}'s turn - Action Points: ${this.gameState.actionPoints}`;
        }
    }

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

    handleRedeployClick() {
        if (this.selectedPiece && this.gameState.canRedeploy(...this.selectedPiece)) {
            this.redeployMode = true;
            this.showIdentityButtons('redeploy');
        }
    }

    showIdentityButtons(action) {
        this.redeployButton.style.display = 'none';
        this.identityButtons.forEach(button => {
            button.style.display = 'inline-block';
            button.onclick = () => this.handleIdentityClick(button.textContent, action);
        });
    }

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

    hideIdentityButtons() {
        this.redeployButton.style.display = 'inline-block';
        this.identityButtons.forEach(button => {
            button.style.display = 'none';
        });
    }
}
