const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const historyElement = document.getElementById("history");
const newGameButton = document.getElementById("newGame");

const whiteTimeElement = document.getElementById("whiteTime");
const blackTimeElement = document.getElementById("blackTime");

const PIECES = {
    white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙"
    },

    black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟"
    }
};

let board = [];
let currentPlayer = "white";

let selectedSquare = null;

let gameOver = false;

let moveHistory = [];

let enPassantTarget = null;

let castlingRights = {
    whiteKing: true,
    whiteQueen: true,
    blackKing: true,
    blackQueen: true
};

let clocks = {
    white: 600,
    black: 600
};

let timer = null;


// ============================
// CREATE STARTING BOARD
// ============================

function createInitialBoard() {

    board = Array.from(
        { length: 8 },
        () => Array(8).fill(null)
    );

    const backRank = [
        "rook",
        "knight",
        "bishop",
        "queen",
        "king",
        "bishop",
        "knight",
        "rook"
    ];

    for (let col = 0; col < 8; col++) {

        board[0][col] = {
            type: backRank[col],
            color: "black"
        };

        board[1][col] = {
            type: "pawn",
            color: "black"
        };

        board[6][col] = {
            type: "pawn",
            color: "white"
        };

        board[7][col] = {
            type: backRank[col],
            color: "white"
        };
    }
}


// ============================
// DRAW BOARD
// ============================

function drawBoard() {

    boardElement.innerHTML = "";

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const square = document.createElement("div");

            square.classList.add("square");

            if ((row + col) % 2 === 0) {
                square.classList.add("light");
            } else {
                square.classList.add("dark");
            }

            square.dataset.row = row;
            square.dataset.col = col;

            const piece = board[row][col];

            if (piece) {

                const pieceElement = document.createElement("span");

                pieceElement.classList.add("piece");

                if (piece.color === "white") {
                    pieceElement.classList.add("white-piece");
                } else {
                    pieceElement.classList.add("black-piece");
                }

                pieceElement.textContent =
                    PIECES[piece.color][piece.type];

                square.appendChild(pieceElement);
            }

            square.addEventListener(
                "click",
                () => handleSquareClick(row, col)
            );

            boardElement.appendChild(square);
        }
    }

    highlightCheck();
}


// ============================
// CLICK SQUARE
// ============================

function handleSquareClick(row, col) {

    if (gameOver) return;

    const piece = board[row][col];

    // Select a piece
    if (!selectedSquare) {

        if (!piece) return;

        if (piece.color !== currentPlayer) return;

        selectedSquare = { row, col };

        highlightSelected();

        return;
    }

    // Select another own piece
    if (
        piece &&
        piece.color === currentPlayer
    ) {

        selectedSquare = { row, col };

        highlightSelected();

        return;
    }

    const moves = getLegalMoves(
        selectedSquare.row,
        selectedSquare.col
    );

    const validMove = moves.some(
        move =>
            move.row === row &&
            move.col === col
    );

    if (!validMove) {

        selectedSquare = null;

        drawBoard();

        return;
    }

    makeMove(
        selectedSquare.row,
        selectedSquare.col,
        row,
        col
    );

    selectedSquare = null;
}


// ============================
// HIGHLIGHT SELECTED PIECE
// ============================

function highlightSelected() {

    drawBoard();

    if (!selectedSquare) return;

    const squares =
        document.querySelectorAll(".square");

    const index =
        selectedSquare.row * 8 +
        selectedSquare.col;

    squares[index].classList.add("selected");

    const moves = getLegalMoves(
        selectedSquare.row,
        selectedSquare.col
    );

    moves.forEach(move => {

        const index =
            move.row * 8 +
            move.col;

        const target = squares[index];

        if (board[move.row][move.col]) {
            target.classList.add("capture");
        } else {
            target.classList.add("legal");
        }
    });
}


// ============================
// GET LEGAL MOVES
// ============================

function getLegalMoves(row, col) {

    const piece = board[row][col];

    if (!piece) return [];

    const pseudoMoves =
        getPseudoMoves(row, col, board);

    const legalMoves = [];

    for (const move of pseudoMoves) {

        const simulatedBoard =
            copyBoard(board);

        movePieceOnBoard(
            simulatedBoard,
            row,
            col,
            move.row,
            move.col,
            move
        );

        if (
            !isKingInCheck(
                simulatedBoard,
                piece.color
            )
        ) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
}


// ============================
// PIECE MOVEMENT
// ============================

function getPseudoMoves(row, col, position) {

    const piece = position[row][col];

    if (!piece) return [];

    const moves = [];

    const add = (r, c, extra = {}) => {

        if (
            r < 0 ||
            r > 7 ||
            c < 0 ||
            c > 7
        ) return;

        const target = position[r][c];

        if (!target) {

            moves.push({
                row: r,
                col: c,
                ...extra
            });

        } else if (
            target.color !== piece.color &&
            target.type !== "king"
        ) {

            moves.push({
                row: r,
                col: c,
                ...extra
            });
        }
    };

    // PAWN
    if (piece.type === "pawn") {

        const direction =
            piece.color === "white" ? -1 : 1;

        const startRow =
            piece.color === "white" ? 6 : 1;

        const oneRow = row + direction;

        if (
            oneRow >= 0 &&
            oneRow <= 7 &&
            !position[oneRow][col]
        ) {

            moves.push({
                row: oneRow,
                col
            });

            const twoRow =
                row + direction * 2;

            if (
                row === startRow &&
                !position[twoRow][col]
            ) {

                moves.push({
                    row: twoRow,
                    col
                });
            }
        }

        for (const dc of [-1, 1]) {

            const captureCol = col + dc;

            if (
                captureCol < 0 ||
                captureCol > 7
            ) continue;

            const target =
                position[oneRow]?.[captureCol];

            if (
                target &&
                target.color !== piece.color &&
                target.type !== "king"
            ) {

                moves.push({
                    row: oneRow,
                    col: captureCol
                });
            }

            if (
                enPassantTarget &&
                enPassantTarget.row === oneRow &&
                enPassantTarget.col === captureCol
            ) {

                moves.push({
                    row: oneRow,
                    col: captureCol,
                    enPassant: true
                });
            }
        }
    }


    // KNIGHT
    if (piece.type === "knight") {

        const jumps = [
            [-2, -1],
            [-2, 1],
            [-1, -2],
            [-1, 2],
            [1, -2],
            [1, 2],
            [2, -1],
            [2, 1]
        ];

        jumps.forEach(([dr, dc]) => {

            add(row + dr, col + dc);
        });
    }


    // KING
    if (piece.type === "king") {

        for (let dr = -1; dr <= 1; dr++) {

            for (let dc = -1; dc <= 1; dc++) {

                if (dr === 0 && dc === 0) continue;

                add(row + dr, col + dc);
            }
        }

        // Castling
        if (
            !isKingInCheck(
                position,
                piece.color
            )
        ) {

            const kingSide =
                piece.color === "white"
                    ? castlingRights.whiteKing
                    : castlingRights.blackKing;

            const queenSide =
                piece.color === "white"
                    ? castlingRights.whiteQueen
                    : castlingRights.blackQueen;

            const backRow =
                piece.color === "white" ? 7 : 0;

            // King side
            if (
                kingSide &&
                position[backRow][5] === null &&
                position[backRow][6] === null &&
                position[backRow][7]?.type === "rook" &&
                position[backRow][7]?.color === piece.color &&
                !squareAttacked(
                    position,
                    backRow,
                    5,
                    opposite(piece.color)
                ) &&
                !squareAttacked(
                    position,
                    backRow,
                    6,
                    opposite(piece.color)
                )
            ) {

                moves.push({
                    row: backRow,
                    col: 6,
                    castle: "king"
                });
            }

            // Queen side
            if (
                queenSide &&
                position[backRow][1] === null &&
                position[backRow][2] === null &&
                position[backRow][3] === null &&
                position[backRow][0]?.type === "rook" &&
                position[backRow][0]?.color === piece.color &&
                !squareAttacked(
                    position,
                    backRow,
                    3,
                    opposite(piece.color)
                ) &&
                !squareAttacked(
                    position,
                    backRow,
                    2,
                    opposite(piece.color)
                )
            ) {

                moves.push({
                    row: backRow,
                    col: 2,
                    castle: "queen"
                });
            }
        }
    }


    // ROOK
    if (piece.type === "rook") {

        addSlidingMoves(
            row,
            col,
            position,
            [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1]
            ],
            moves
        );
    }


    // BISHOP
    if (piece.type === "bishop") {

        addSlidingMoves(
            row,
            col,
            position,
            [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1]
            ],
            moves
        );
    }


    // QUEEN
    if (piece.type === "queen") {

        addSlidingMoves(
            row,
            col,
            position,
            [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1]
            ],
            moves
        );
    }

    return moves;
}


// ============================
// SLIDING PIECES
// ============================

function addSlidingMoves(
    row,
    col,
    position,
    directions,
    moves
) {

    const piece = position[row][col];

    for (const [dr, dc] of directions) {

        let r = row + dr;
        let c = col + dc;

        while (
            r >= 0 &&
            r < 8 &&
            c >= 0 &&
            c < 8
        ) {

            const target = position[r][c];

            if (!target) {

                moves.push({
                    row: r,
                    col: c
                });

            } else {

                if (
                    target.color !== piece.color &&
                    target.type !== "king"
                ) {

                    moves.push({
                        row: r,
                        col: c
                    });
                }

                break;
            }

            r += dr;
            c += dc;
        }
    }
}


// ============================
// MAKE MOVE
// ============================

function makeMove(
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    const piece = board[fromRow][fromCol];

    const moves =
        getLegalMoves(fromRow, fromCol);

    const move = moves.find(
        m =>
            m.row === toRow &&
            m.col === toCol
    );

    if (!move) return;

    const captured =
        board[toRow][toCol];

    const movedType = piece.type;

    const analysis =
        analyzeMove(piece.color, fromRow, fromCol, toRow, toCol);

    const fromName =
        squareName(fromRow, fromCol);

    const toName =
        squareName(toRow, toCol);

    // En passant capture
    if (move.enPassant) {

        const capturedRow =
            piece.color === "white"
                ? toRow + 1
                : toRow - 1;

        board[capturedRow][toCol] = null;
    }

    board[toRow][toCol] = piece;

    board[fromRow][fromCol] = null;


    // Castling
    if (move.castle === "king") {

        board[toRow][5] =
            board[toRow][7];

        board[toRow][7] = null;
    }

    if (move.castle === "queen") {

        board[toRow][3] =
            board[toRow][0];

        board[toRow][0] = null;
    }


    // Update castling rights
    updateCastlingRights(
        piece,
        fromRow,
        fromCol,
        toRow,
        toCol
    );


    // En passant target
    enPassantTarget = null;

    if (
        piece.type === "pawn" &&
        Math.abs(toRow - fromRow) === 2
    ) {

        enPassantTarget = {
            row: (fromRow + toRow) / 2,
            col: fromCol
        };
    }


    // Promotion
    if (
        piece.type === "pawn" &&
        (toRow === 0 || toRow === 7)
    ) {

        const choice =
            prompt(
                "Promote pawn to: queen, rook, bishop, or knight",
                "queen"
            );

        const validChoices = [
            "queen",
            "rook",
            "bishop",
            "knight"
        ];

        piece.type =
            validChoices.includes(
                choice?.toLowerCase()
            )
                ? choice.toLowerCase()
                : "queen";
    }


    // Record move + coach review
    const entry = {
        color: piece.color,
        from: fromName,
        to: toName,
        captured: captured
            ? captured.type
            : (move.enPassant ? "pawn" : null)
    };

    currentPlayer =
        opposite(currentPlayer);

    reviewMove(entry, analysis, {
        type: movedType,
        promoted: piece.type !== movedType ? piece.type : null,
        fromCol,
        toRow,
        toCol,
        move
    });

    moveHistory.push(entry);

    updateHistory();

    showCommentary(entry);

    drawBoard();

    checkGameState();

    if (gameOver) showGameSummary();
}


// ============================
// CASTLING RIGHTS
// ============================

function updateCastlingRights(
    piece,
    fromRow,
    fromCol,
    toRow,
    toCol
) {

    if (piece.type === "king") {

        if (piece.color === "white") {

            castlingRights.whiteKing = false;
            castlingRights.whiteQueen = false;

        } else {

            castlingRights.blackKing = false;
            castlingRights.blackQueen = false;
        }
    }

    if (piece.type === "rook") {

        if (
            piece.color === "white" &&
            fromRow === 7 &&
            fromCol === 0
        ) {
            castlingRights.whiteQueen = false;
        }

        if (
            piece.color === "white" &&
            fromRow === 7 &&
            fromCol === 7
        ) {
            castlingRights.whiteKing = false;
        }

        if (
            piece.color === "black" &&
            fromRow === 0 &&
            fromCol === 0
        ) {
            castlingRights.blackQueen = false;
        }

        if (
            piece.color === "black" &&
            fromRow === 0 &&
            fromCol === 7
        ) {
            castlingRights.blackKing = false;
        }
    }

    // Capturing a rook
    if (toRow === 7 && toCol === 0)
        castlingRights.whiteQueen = false;

    if (toRow === 7 && toCol === 7)
        castlingRights.whiteKing = false;

    if (toRow === 0 && toCol === 0)
        castlingRights.blackQueen = false;

    if (toRow === 0 && toCol === 7)
        castlingRights.blackKing = false;
}


// ============================
// KING CHECK
// ============================

function isKingInCheck(
    position,
    color
) {

    let king = null;

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = position[r][c];

            if (
                piece &&
                piece.color === color &&
                piece.type === "king"
            ) {

                king = {
                    row: r,
                    col: c
                };
            }
        }
    }

    if (!king) return true;

    return squareAttacked(
        position,
        king.row,
        king.col,
        opposite(color)
    );
}


// ============================
// SQUARE ATTACKED
// ============================

function squareAttacked(
    position,
    row,
    col,
    attackerColor
) {

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = position[r][c];

            if (
                !piece ||
                piece.color !== attackerColor
            ) continue;

            if (
                pieceAttacksSquare(
                    position,
                    r,
                    c,
                    row,
                    col
                )
            ) {
                return true;
            }
        }
    }

    return false;
}


// ============================
// PIECE ATTACK LOGIC
// ============================

function pieceAttacksSquare(
    position,
    r,
    c,
    targetR,
    targetC
) {

    const piece = position[r][c];

    const dr = targetR - r;
    const dc = targetC - c;

    if (piece.type === "pawn") {

        const direction =
            piece.color === "white" ? -1 : 1;

        return (
            dr === direction &&
            Math.abs(dc) === 1
        );
    }

    if (piece.type === "knight") {

        return (
            Math.abs(dr) === 2 &&
            Math.abs(dc) === 1
        ) ||
        (
            Math.abs(dr) === 1 &&
            Math.abs(dc) === 2
        );
    }

    if (piece.type === "king") {

        return (
            Math.abs(dr) <= 1 &&
            Math.abs(dc) <= 1
        );
    }

    let validDirection = false;

    if (piece.type === "rook") {

        validDirection =
            dr === 0 ||
            dc === 0;
    }

    if (piece.type === "bishop") {

        validDirection =
            Math.abs(dr) === Math.abs(dc);
    }

    if (piece.type === "queen") {

        validDirection =
            dr === 0 ||
            dc === 0 ||
            Math.abs(dr) === Math.abs(dc);
    }

    if (!validDirection) return false;

    const stepR = Math.sign(dr);
    const stepC = Math.sign(dc);

    let currentR = r + stepR;
    let currentC = c + stepC;

    while (
        currentR !== targetR ||
        currentC !== targetC
    ) {

        if (position[currentR][currentC]) {
            return false;
        }

        currentR += stepR;
        currentC += stepC;
    }

    return true;
}


// ============================
// COPY BOARD
// ============================

function copyBoard(position) {

    return position.map(
        row =>
            row.map(
                piece =>
                    piece
                        ? { ...piece }
                        : null
            )
    );
}


// ============================
// SIMULATE MOVE
// ============================

function movePieceOnBoard(
    position,
    fromRow,
    fromCol,
    toRow,
    toCol,
    move
) {

    const piece =
        position[fromRow][fromCol];

    position[toRow][toCol] = {
        ...piece
    };

    position[fromRow][fromCol] = null;

    if (move.enPassant) {

        const capturedRow =
            piece.color === "white"
                ? toRow + 1
                : toRow - 1;

        position[capturedRow][toCol] = null;
    }

    if (move.castle === "king") {

        position[toRow][5] =
            position[toRow][7];

        position[toRow][7] = null;
    }

    if (move.castle === "queen") {

        position[toRow][3] =
            position[toRow][0];

        position[toRow][0] = null;
    }
}


// ============================
// CHECK GAME STATE
// ============================

function checkGameState() {

    const inCheck =
        isKingInCheck(
            board,
            currentPlayer
        );

    let hasMove = false;

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = board[r][c];

            if (
                piece &&
                piece.color === currentPlayer
            ) {

                if (
                    getLegalMoves(r, c).length > 0
                ) {

                    hasMove = true;
                    break;
                }
            }
        }

        if (hasMove) break;
    }


    if (!hasMove && inCheck) {

        gameOver = true;

        const winner =
            currentPlayer === "white"
                ? "Black"
                : "White";

        statusElement.textContent =
            `♚ Checkmate! ${winner} wins!`;

        stopTimer();

        return;
    }


    if (!hasMove && !inCheck) {

        gameOver = true;

        statusElement.textContent =
            "🤝 Stalemate! Draw.";

        stopTimer();

        return;
    }


    if (inCheck) {

        statusElement.textContent =
            `⚠️ ${capitalize(currentPlayer)} is in check!`;

    } else {

        statusElement.textContent =
            `${capitalize(currentPlayer)}'s turn`;
    }
}


// ============================
// HIGHLIGHT CHECK
// ============================

function highlightCheck() {

    const squares =
        document.querySelectorAll(".square");

    if (!isKingInCheck(board, "white") &&
        !isKingInCheck(board, "black")) {
        return;
    }

    const checkedColor =
        isKingInCheck(board, "white")
            ? "white"
            : "black";

    for (let r = 0; r < 8; r++) {

        for (let c = 0; c < 8; c++) {

            const piece = board[r][c];

            if (
                piece &&
                piece.color === checkedColor &&
                piece.type === "king"
            ) {

                squares[
                    r * 8 + c
                ].classList.add("check");
            }
        }
    }
}


// ============================
// MOVE COACH: ANALYSIS, ELO & COMMENTARY
// ============================

const VALUE = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 0 };
const LETTER = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N", pawn: "" };

const OPENINGS = {
    "e4": "King's Pawn Opening", "d4": "Queen's Pawn Opening", "c4": "English Opening",
    "Nf3": "Réti Opening", "f4": "Bird's Opening", "g3": "King's Fianchetto Opening",
    "e4 e5": "Open Game", "e4 c5": "Sicilian Defence", "e4 e6": "French Defence",
    "e4 c6": "Caro-Kann Defence", "e4 d5": "Scandinavian Defence", "e4 d6": "Pirc Defence",
    "e4 g6": "Modern Defence", "e4 Nf6": "Alekhine's Defence",
    "e4 e5 Nf3": "King's Knight Opening", "e4 e5 Nf3 Nc6": "Open Game, Knights developed",
    "e4 e5 Nf3 Nc6 Bb5": "Ruy López", "e4 e5 Nf3 Nc6 Bc4": "Italian Game",
    "e4 e5 Nf3 Nc6 d4": "Scotch Game", "e4 e5 Nf3 Nf6": "Petrov's Defence",
    "e4 e5 f4": "King's Gambit", "e4 e5 Nc3": "Vienna Game",
    "d4 d5": "Closed Game", "d4 d5 c4": "Queen's Gambit", "d4 Nf6": "Indian Defence",
    "d4 Nf6 c4 g6": "King's Indian set-up", "d4 f5": "Dutch Defence", "c4 e5": "Reversed Sicilian"
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const fill = (t, d) => t.replace(/\{(\w+)\}/g, (_, k) => d[k]);


// ---------- evaluation + search helpers ----------

function evalPos(pos, me) {
    let s = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = pos[r][c];
        if (!p) continue;
        let v = VALUE[p.type];
        const d = Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
        if (p.type === "knight" || p.type === "bishop") v += (3.5 - d) * 8 + ((p.color === "white" ? r !== 7 : r !== 0) ? 8 : 0);
        if (p.type === "pawn") v += (3.5 - d) * 4 + (p.color === "white" ? 6 - r : r - 1) * 3;
        if (p.type === "queen") v += (3.5 - d) * 2;
        if (p.type === "king" && r === (p.color === "white" ? 7 : 0) && (c === 6 || c === 2)) v += 25;
        s += p.color === me ? v : -v;
    }
    return s;
}

function simMove(pos, m) {
    const p = copyBoard(pos);
    const pc = p[m.fromRow][m.fromCol];
    p[m.row][m.col] = { ...pc };
    p[m.fromRow][m.fromCol] = null;
    if (m.enPassant) p[pc.color === "white" ? m.row + 1 : m.row - 1][m.col] = null;
    if (m.castle === "king") { p[m.row][5] = p[m.row][7]; p[m.row][7] = null; }
    if (m.castle === "queen") { p[m.row][3] = p[m.row][0]; p[m.row][0] = null; }
    if (pc.type === "pawn" && (m.row === 0 || m.row === 7)) p[m.row][m.col].type = "queen";
    return p;
}

function epAfter(pos, m) {
    const p = pos[m.fromRow][m.fromCol];
    return p.type === "pawn" && Math.abs(m.row - m.fromRow) === 2
        ? { row: (m.fromRow + m.row) / 2, col: m.fromCol } : null;
}

function allLegal(pos, color, ep) {
    const saved = enPassantTarget;
    enPassantTarget = ep;
    const out = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = pos[r][c];
        if (!p || p.color !== color) continue;
        for (const m of getPseudoMoves(r, c, pos)) {
            const mv = { ...m, fromRow: r, fromCol: c };
            if (!isKingInCheck(simMove(pos, mv), color)) out.push(mv);
        }
    }
    enPassantTarget = saved;
    return out;
}

function findMateIn1(pos, color, ep, skipCastle) {
    const opp = opposite(color);
    for (const m of allLegal(pos, color, ep)) {
        if (skipCastle && m.castle) continue;
        const p = simMove(pos, m);
        if (isKingInCheck(p, opp) && allLegal(p, opp, epAfter(pos, m)).length === 0) return m;
    }
    return null;
}

function scoreMove(pos, m, me) {
    const opp = opposite(me);
    const p1 = simMove(pos, m);
    const replies = allLegal(p1, opp, epAfter(pos, m));
    if (!replies.length) return isKingInCheck(p1, opp) ? 100000 : 0;
    let worst = Infinity;
    for (const r of replies) worst = Math.min(worst, evalPos(simMove(p1, r), me));
    return worst;
}

function sanOf(type, fromCol, m, isCapture, promo) {
    if (m.castle) return m.castle === "king" ? "O-O" : "O-O-O";
    const sq = squareName(m.row, m.col);
    let s = type === "pawn"
        ? (isCapture ? "abcdefgh"[fromCol] + "x" + sq : sq)
        : LETTER[type] + (isCapture ? "x" : "") + sq;
    if (promo) s += "=" + LETTER[promo];
    return s;
}

function sanFromBoard(pos, m) {
    const p = pos[m.fromRow][m.fromCol];
    return sanOf(p.type, m.fromCol, m, !!pos[m.row][m.col] || !!m.enPassant);
}


// ---------- BEFORE the move: how good is it? ----------

function analyzeMove(color, fromRow, fromCol, toRow, toCol) {
    const scored = allLegal(board, color, enPassantTarget)
        .map(m => ({ m, score: scoreMove(board, m, color) }))
        .sort((a, b) => b.score - a.score);
    const played = scored.find(x => x.m.fromRow === fromRow && x.m.fromCol === fromCol &&
        x.m.row === toRow && x.m.col === toCol) || scored[scored.length - 1];
    const best = scored[0];
    return {
        loss: Math.max(0, best.score - played.score),
        playedScore: played.score,
        bestScore: best.score,
        isBest: played.score >= best.score,
        gap: scored.length > 1 ? best.score - scored[1].score : 0,
        bestSan: sanFromBoard(board, best.m)
    };
}


// ---------- AFTER the move: rate it + write the comment ----------

const BANDS = [
    [5, 1550, 1350, "best"], [30, 1350, 1150, "great"], [80, 1150, 850, "good"],
    [180, 850, 550, "inaccuracy"], [400, 550, 300, "mistake"], [1500, 300, 100, "blunder"]
];

function eloFromLoss(loss) {
    let lo = 0;
    for (const [hi, eHi, eLo, cls] of BANDS) {
        if (loss <= hi) {
            const t = Math.min(1, (loss - lo) / (hi - lo));
            return { elo: eHi + (eLo - eHi) * t, cls };
        }
        lo = hi;
    }
    return { elo: 100, cls: "blunder" };
}

const LABELS = {
    checkmate: "Checkmate", brilliant: "Brilliant", book: "Book", best: "Best move",
    great: "Great", good: "Good", inaccuracy: "Inaccuracy", mistake: "Mistake", blunder: "Blunder"
};

function reviewMove(entry, a, info) {
    const me = entry.color, opp = currentPlayer;
    const who = capitalize(me), oppName = capitalize(opp);
    const oppMoves = allLegal(board, opp, enPassantTarget);
    const inCheck = isKingInCheck(board, opp);
    const mate = oppMoves.length === 0 && inCheck;
    const stalemate = oppMoves.length === 0 && !inCheck;
    const isCapture = !!entry.captured;

    entry.san = sanOf(info.type, info.fromCol, { row: info.toRow, col: info.toCol, castle: info.move.castle },
        isCapture, info.promoted) + (mate ? "#" : inCheck ? "+" : "");

    // opening book
    const clean = s => s.replace(/[+#]/g, "");
    const seq = moveHistory.map(m => clean(m.san)).concat(clean(entry.san)).join(" ");
    const inBook = Object.keys(OPENINGS).some(k => k === seq || k.startsWith(seq + " "));
    const openingName = OPENINGS[seq] || null;

    // tactics
    const moved = board[info.toRow][info.toCol];
    let hanging = false;
    if (!mate && moved.type !== "king") {
        const b2 = copyBoard(board);
        b2[info.toRow][info.toCol] = null;
        hanging = squareAttacked(b2, info.toRow, info.toCol, opp) &&
                  !squareAttacked(b2, info.toRow, info.toCol, me);
    }
    let allowedMate = null, threat = null, savers = 0, savePiece = "";
    if (!mate && !stalemate) {
        allowedMate = findMateIn1(board, opp, enPassantTarget, false);
        if (!allowedMate && !inCheck) {
            threat = findMateIn1(board, me, null, true);
            if (threat) {
                const good = oppMoves.filter(m => !findMateIn1(simMove(board, m), me, epAfter(board, m), true));
                savers = good.length;
                if (savers === 1) savePiece = board[good[0].fromRow][good[0].fromCol].type;
            }
        }
    }
    const missedMate = a.bestScore >= 90000 && a.playedScore < 90000;

    // rating
    let cls, elo;
    if (mate) { cls = "checkmate"; elo = rand(1850, 2000); }
    else if (allowedMate) { cls = "blunder"; elo = rand(100, 250); }
    else if (missedMate) { cls = "mistake"; elo = rand(250, 450); }
    else if (a.isBest && a.gap >= 200 && (!isCapture || hanging)) { cls = "brilliant"; elo = rand(1650, 2000); }
    else if (inBook && a.loss <= 120) { cls = "book"; elo = rand(1000, 1400); }
    else { const r = eloFromLoss(a.loss); cls = r.cls; elo = r.elo + rand(-25, 25); }
    entry.elo = Math.round(Math.min(2000, Math.max(100, elo)));
    entry.cls = cls;
    entry.label = LABELS[cls];

    // commentary
    const d = {
        who, opp: oppName, piece: info.type, san: entry.san, sq: entry.to,
        captured: entry.captured, bestSan: a.bestSan, pawns: (a.loss / 100).toFixed(1),
        name: openingName, mateSan: allowedMate ? sanFromBoard(board, allowedMate) : "",
        threatSan: threat ? sanFromBoard(board, threat) : "", promo: info.promoted
    };
    let text;
    if (mate) text = pick([
        "Checkmate! {who}'s {piece} slams the door on {opp}'s king. Curtain call.",
        "{san} — and {opp}'s king has nowhere left to run. What a finish.",
        "Mate! {opp} never saw {san} coming... or saw it and had no answer."
    ]);
    else if (stalemate) text = "Stalemate! {who} had the upper hand and let the king slip away. A draw is a draw.";
    else if (allowedMate) text = pick([
        "{opp}, wake up! After {san} you have mate in one: {mateSan}. {who} just left the door wide open.",
        "Yikes. {san} allows {mateSan}# — {opp}, this is your moment."
    ]);
    else if (missedMate) text = pick([
        "{who}, {bestSan} was checkmate in one and you walked right past it. Somewhere a coach is weeping.",
        "Mate was sitting right there — {bestSan}#. {san} is fine, but a missed mate is a missed mate."
    ]);
    else if (threat) {
        const save = savers === 0 ? "there is no defence — this might already be over"
            : savers === 1 ? `only one wise move keeps you alive (hint: look at your ${savePiece})`
            : `only ${savers} moves stop it, so choose carefully`;
        text = fill("{who} is cooking: mate threatens next with {threatSan}. {opp}, " + save + ". Can you find it?", d);
    }
    else if (hanging && cls !== "brilliant") text = pick([
        "{opp}, something looks fishy about that {piece} on {sq}. Can you spot it?",
        "That {piece} landed on {sq} with no backup at all... seems fishy. Spot the free capture?",
        "Bold! {who}'s {piece} is standing on {sq} all alone. {opp}, check your capture options."
    ]);
    else if (cls === "brilliant") text = pick([
        "{san}!! A brilliant idea — the kind you replay in your head at night.",
        "Quiet, deep, and precise. {san} is the only move that really works. Brilliant.",
        "{who} finds {san}, the move everyone else walks past. Brilliant!"
    ]);
    else if (cls === "blunder") text = pick([
        "Ouch. {san} throws away about {pawns} pawns of advantage; {bestSan} was the move.",
        "{who} just gave the game a gift. {bestSan} would have kept everything together."
    ]);
    else if (cls === "mistake") text = pick([
        "Hmm, {san} isn't a disaster, but {bestSan} would have kept the pressure on.",
        "That {piece} move loosens your grip. Better was {bestSan}."
    ]);
    else if (cls === "inaccuracy") text = pick([
        "A slight wobble. {san} works — {bestSan} works better.",
        "Not wrong, just not sharp. {bestSan} was a shade stronger."
    ]);
    else if (cls === "great" || cls === "best") text = pick([
        "Exactly what the position asked for — {san} is spot on.",
        "Clean and confident. {san} is precisely the kind of move strong players find.",
        "{who} keeps the machine humming with {san}."
    ]);
    else if (cls === "book") text = pick([
        "Textbook stuff. {san} is theory, and theory is comfortable.",
        "A well-trodden path — {san} has been played by thousands before you."
    ]);
    else text = pick([
        "Solid {piece} move. Nothing flashy, nothing fishy.",
        "{san} does the job. A sensible, steady choice."
    ]);
    text = fill(text, d);

    const extra = [];
    if (openingName && !mate) extra.push(fill(pick([
        "That's the {name}.", "Opening spotted: {name}.", "Fans of the {name} are cheering."
    ]), d));
    if (info.move.castle && !mate) extra.push("Castling — king tucked away, rook joins the party.");
    if (info.promoted) extra.push(fill("A pawn becomes a {promo}! Hard work pays off.", d));
    if (isCapture && !mate && !allowedMate) extra.push(fill("It takes the {captured}.", d));
    entry.comment = [...extra, text].join(" ");
}


// ---------- UI ----------

function showCommentary(e) {
    document.getElementById("commentary").innerHTML =
        `<div class="c-head"><span class="c-move">${e.color === "white" ? "♙" : "♟"} ${capitalize(e.color)} · ${e.san}</span>` +
        `<span class="elo-badge ${e.cls}">${e.elo}</span></div>` +
        `<div class="c-label ${e.cls}">${e.label} · move Elo</div><p>${e.comment}</p>`;
}

function resetCommentary() {
    document.getElementById("commentary").innerHTML =
        `<p class="c-empty">Make a move — I'll tell you what I think of it, and how strong it really was.</p>`;
}

function avgElo(color) {
    const m = moveHistory.filter(x => x.color === color);
    return m.length ? Math.round(m.reduce((s, x) => s + x.elo, 0) / m.length) : null;
}

function updateAverages() {
    for (const c of ["white", "black"]) {
        const a = avgElo(c);
        document.getElementById(c + "Avg").textContent = a ? `avg Elo ${a}` : "";
    }
}

function showGameSummary() {
    const title = a => a === null ? "—" : a > 1300 ? "Grandmaster energy" : a > 900 ? "Solid club player"
        : a > 550 ? "Enthusiastic beginner" : "Chaos gremlin";
    const line = c => {
        const a = avgElo(c), mv = moveHistory.filter(x => x.color === c);
        const worst = mv.reduce((w, x) => (!w || x.elo < w.elo ? x : w), null);
        return `<p><b>${capitalize(c)}</b>: avg Elo ${a ?? "—"} — ${title(a)}` +
            (worst ? `. Roughest moment: ${worst.san} (Elo ${worst.elo}).` : ".") + `</p>`;
    };
    document.getElementById("commentary").innerHTML =
        `<div class="c-head"><span class="c-move">Game review</span></div>` + line("white") + line("black");
}

function updateHistory() {
    if (moveHistory.length === 0) {
        historyElement.textContent = "No moves yet";
        updateAverages();
        return;
    }
    historyElement.innerHTML = "";
    const cell = m => m ? `<span class="h-move">${m.san}<b class="elo-tag ${m.cls}">${m.elo}</b></span>` : "";
    for (let i = 0; i < moveHistory.length; i += 2) {
        const line = document.createElement("div");
        line.className = "h-row";
        line.innerHTML = `<strong>${i / 2 + 1}.</strong>${cell(moveHistory[i])}${cell(moveHistory[i + 1])}`;
        historyElement.appendChild(line);
    }
    historyElement.scrollTop = historyElement.scrollHeight;
    updateAverages();
}


// ============================
// TIMER
// ============================

function startTimer() {

    stopTimer();

    timer = setInterval(() => {

        if (gameOver) return;

        clocks[currentPlayer]--;

        updateClockDisplay();

        if (clocks[currentPlayer] <= 0) {

            gameOver = true;

            const winner =
                currentPlayer === "white"
                    ? "Black"
                    : "White";

            statusElement.textContent =
                `⏰ Time out! ${winner} wins!`;

            stopTimer();

            showGameSummary();
        }

    }, 1000);
}


function stopTimer() {

    if (timer) {

        clearInterval(timer);

        timer = null;
    }
}


function updateClockDisplay() {

    whiteTimeElement.textContent =
        formatTime(clocks.white);

    blackTimeElement.textContent =
        formatTime(clocks.black);
}


function formatTime(seconds) {

    seconds = Math.max(0, seconds);

    const minutes =
        Math.floor(seconds / 60);

    const remaining =
        seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remaining).padStart(2, "0")
    );
}


// ============================
// NEW GAME
// ============================

function newGame() {

    stopTimer();

    currentPlayer = "white";

    selectedSquare = null;

    gameOver = false;

    moveHistory = [];

    resetCommentary();

    enPassantTarget = null;

    castlingRights = {
        whiteKing: true,
        whiteQueen: true,
        blackKing: true,
        blackQueen: true
    };

    clocks = {
        white: 600,
        black: 600
    };

    createInitialBoard();

    updateHistory();

    updateClockDisplay();

    drawBoard();

    statusElement.textContent =
        "White's turn";

    startTimer();
}


newGameButton.addEventListener(
    "click",
    newGame
);


// ============================
// HELPERS
// ============================

function opposite(color) {

    return color === "white"
        ? "black"
        : "white";
}


function capitalize(text) {

    return text.charAt(0).toUpperCase() +
           text.slice(1);
}


function squareName(row, col) {

    const files = "abcdefgh";

    return (
        files[col] +
        (8 - row)
    );
}


// ============================
// START GAME
// ============================

newGame();
