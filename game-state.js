class Piece {
    constructor(player, identity) {
        this.player = player;
        this.identity = identity;
        this.revealed = false;
    }

    reveal() {
        this.revealed = true;
    }

    hide() {
        this.revealed = false;
    }
}

class GameState {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.currentPlayer = 1;
        this.actionPoints = 3;
        this.peekingAll = false;
        this.initializeBoard();
    }

    initializeBoard() {
        const identities = ['red', 'green', 'blue'];
        
        this.shuffleArray(identities);
        
        const player1Positions = [[0, 1], [1, 0], [1, 1]];
        this.shuffleArray(player1Positions);
        player1Positions.forEach((pos, index) => {
            this.board[pos[0]][pos[1]] = new Piece(1, identities[index]);
        });

        this.shuffleArray(identities);
        
        const player2Positions = [[7, 6], [6, 7], [6, 6]];
        this.shuffleArray(player2Positions);
        player2Positions.forEach((pos, index) => {
            this.board[pos[0]][pos[1]] = new Piece(2, identities[index]);
        });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    randomIdentity() {
        const identities = ['red', 'green', 'blue'];
        return identities[Math.floor(Math.random() * identities.length)];
    }

    isValidMove(fromX, fromY, toX, toY) {
        if (this.actionPoints < 1) return false;
        if (fromX < 0 || fromX > 7 || fromY < 0 || fromY > 7) return false;
        if (toX < 0 || toX > 7 || toY < 0 || toY > 7) return false;
        if (Math.abs(fromX - toX) + Math.abs(fromY - toY) !== 1) return false;
        if (!this.board[fromY][fromX] || this.board[fromY][fromX].player !== this.currentPlayer) return false;
        if (this.board[toY][toX] && this.board[toY][toX].player === this.currentPlayer) return false;
        return true;
    }

    move(fromX, fromY, toX, toY) {
        if (!this.isValidMove(fromX, fromY, toX, toY)) return false;

        const movingPiece = this.board[fromY][fromX];
        const targetPiece = this.board[toY][toX];

        if (targetPiece) {
            movingPiece.reveal();
            targetPiece.reveal();

            const attackResult = this.resolveAttack(movingPiece.identity, targetPiece.identity);
            // Handle attack outcome
            if (attackResult > 0) {
                // Attacker wins
                this.board[toY][toX] = movingPiece;
                this.board[fromY][fromX] = null;
            } else if (attackResult < 0) {
                // Defender wins
                this.board[fromY][fromX] = null;
            }
        } else {
            this.board[toY][toX] = movingPiece;
            this.board[fromY][fromX] = null;
        }

        this.actionPoints--;
        if (this.actionPoints === 0) this.endTurn();
        // check for win condition

        if ((this.currentPlayer === 1 && this.board[toY][toX].player === 1 && toX === 7 && toY === 7) || 
            (this.currentPlayer === 2 && this.board[toY][toX].player === 2 && toX === 0 && toY === 0)) {
            return 'win';
        }

        return true;
    }

    resolveAttack(attackerIdentity, defenderIdentity) {
        if (attackerIdentity === defenderIdentity) return 0;
        if ((attackerIdentity === 'red' && defenderIdentity === 'green') ||
            (attackerIdentity === 'green' && defenderIdentity === 'blue') ||
            (attackerIdentity === 'blue' && defenderIdentity === 'red')) {
            return 1;
        }
        return -1;
    }

    startPeekingAll() {
        this.peekingAll = true;
    }

    stopPeekingAll() {
        this.peekingAll = false;
    }

    canRedeploy(x, y) {
        return this.actionPoints >= 2 && this.board[y][x] && this.board[y][x].player === this.currentPlayer;
    }

    redeploy(x, y, newIdentity) {
        if (!this.canRedeploy(x, y)) return false;
        const piece = this.board[y][x];
        piece.identity = newIdentity;
        piece.hide();
        this.actionPoints -= 2;
        if (this.actionPoints === 0) this.endTurn();
        return true;
    }

    canRespawn() {
        const homeSquare = this.currentPlayer === 1 ? [0, 0] : [7, 7];
        return this.actionPoints === 3 && 
               !this.board[homeSquare[1]][homeSquare[0]] && 
               this.countPlayerPieces(this.currentPlayer) < 3;
    }

    respawn(identity) {
        if (!this.canRespawn()) return false;
        const [x, y] = this.currentPlayer === 1 ? [0, 0] : [7, 7];
        this.board[y][x] = new Piece(this.currentPlayer, identity);
        this.actionPoints = 0;
        this.endTurn();
        return true;
    }

    countPlayerPieces(player) {
        return this.board.flat().filter(piece => piece && piece.player === player).length;
    }

    endTurn() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.actionPoints = 3;
    }
}

if (typeof module !== 'undefined') {
    module.exports = { Piece, GameState };
}
