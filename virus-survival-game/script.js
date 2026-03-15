// ==================== CONFIGURATION ====================

// Grid dimensions
const ROWS = 20;
const COLS = 30;

// Hazard counts
const WALLS = 35;
const BOMBS = Math.round(0.1 * ROWS * COLS);
const TRAPS = Math.round(0.05 * ROWS * COLS);
const VTRAPS = Math.round(0.07 * ROWS * COLS);

// Power-up counts
const SHIELD_COUNT = 1;
const DOUBLE_COUNT = 1;
const ENERGY_COUNT = 1;

// Enemy AI parameters
let enemyPos = { r: 0, c: 0 }; // Initial enemy position (spawn later randomly)
let visibilityRadius = 3;       // Reserved for future fog-of-war implementation

// ==================== GAME STATE ====================
let grid = [];                  // 2D grid representing the game board
let playerPos = { r: 0, c: 0 }; // Player coordinates
let turn = 0;                    // Turn counter
let score = 0;                   // Player score
let shieldTurns = 0;             // Shield duration in turns
let doubleMove = false;          // Double-move power-up active
let timer = 0;                   // Elapsed game time in seconds
let timerInterval = null;        // Interval ID for timer
let gameOverFlag = false;        // Prevents further actions after game over

// ==================== SOUNDS ====================
const moveSound    = new Audio('sounds/move.mp3');
const hazardSound  = new Audio('sounds/hazard.mp3');
const powerupSound = new Audio('sounds/powerup.mp3');
const winSound     = new Audio('sounds/win.mp3');
const loseSound    = new Audio('sounds/lose.mp3');

// ==================== UTILITY FUNCTIONS ====================

/**
 * Display a message to the player with optional color
 * @param {string} msg - Message text
 * @param {string} color - CSS color (default: black)
 */
function showMessage(msg, color = "black") {
    const msgDiv = document.getElementById('message');
    msgDiv.innerHTML = msg;
    msgDiv.style.color = color;
}

/**
 * Returns a random empty cell in the grid
 */
function getRandomEmptyCell() {
    while (true) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if (grid[r][c] === 'empty' && !(r === 0 && c === 0)) return { r, c };
    }
}

// ==================== INITIALIZE GRID ====================

// Initialize empty grid
for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
        grid[r][c] = 'empty';
    }
}

// Place player and exit
grid[0][0] = 'player';
playerPos = { r: 0, c: 0 };
grid[ROWS - 1][COLS - 1] = 'exit';

// Spawn enemy at random empty cell
enemyPos = getRandomEmptyCell();

// ==================== PLACE OBJECTS ====================

/**
 * Place objects of a given type randomly on the grid
 * @param {string} type - Type of object ('wall', 'bomb', etc.)
 * @param {number} count - Number of objects to place
 */
function placeObjects(type, count) {
    for (let i = 0; i < count; i++) {
        const cell = getRandomEmptyCell();
        grid[cell.r][cell.c] = type;
    }
}

// Place hazards
placeObjects('wall', WALLS);
placeObjects('bomb', BOMBS);
placeObjects('trap', TRAPS);
placeObjects('vtrap', VTRAPS);

// Place power-ups
for (let i = 0; i < SHIELD_COUNT; i++) grid[getRandomEmptyCell().r][getRandomEmptyCell().c] = 'S';
for (let i = 0; i < DOUBLE_COUNT; i++) grid[getRandomEmptyCell().r][getRandomEmptyCell().c] = 'D';
for (let i = 0; i < ENERGY_COUNT; i++) grid[getRandomEmptyCell().r][getRandomEmptyCell().c] = '*';

// ==================== TIMER ====================

/**
 * Start the game timer
 */
function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        document.getElementById('timer').innerText = timer;
    }, 1000);
}

// ==================== BFS HINT PATH ====================

/**
 * Find the shortest safe path from player to exit using BFS
 * Returns an array of cell coordinates
 */
function getHintPath() {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const prev = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const queue = [{ r: playerPos.r, c: playerPos.c }];
    visited[playerPos.r][playerPos.c] = true;

    let exitPos = null;

    while (queue.length) {
        const { r, c } = queue.shift();
        if (grid[r][c] === 'exit') {
            exitPos = { r, c };
            break;
        }

        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
            if (visited[nr][nc]) return;
            const cellType = grid[nr][nc];
            if (cellType === 'wall' || cellType === 'bomb' || cellType === 'vtrap') return;
            visited[nr][nc] = true;
            prev[nr][nc] = { r, c };
            queue.push({ r: nr, c: nc });
        });
    }

    if (!exitPos) return [];

    const path = [];
    let cur = exitPos;
    while (cur && !(cur.r === playerPos.r && cur.c === playerPos.c)) {
        path.push(cur);
        cur = prev[cur.r][cur.c];
    }

    return path.reverse();
}

// ==================== SHUFFLE HAZARDS ====================

/**
 * Randomly shuffle a fraction of hazards on the grid
 */
function shuffleHazardsComplex() {
    const fraction = 0.3;

    function collect(type) {
        const arr = [];
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (grid[r][c] === type) arr.push({ r, c });
        return arr;
    }

    ['bomb', 'trap', 'vtrap'].forEach(type => {
        const positions = collect(type);
        const moves = Math.max(1, Math.floor(positions.length * fraction));

        // Shuffle positions
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        // Move fraction of hazards to new empty cells
        for (let i = 0; i < moves && i < positions.length; i++) {
            const oldPos = positions[i];
            grid[oldPos.r][oldPos.c] = 'empty';
            const newPos = getRandomEmptyCell();
            grid[newPos.r][newPos.c] = type;
        }
    });
}

// ==================== RENDER BOARD ====================

/**
 * Render the game board and UI elements
 */
function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';

    const hint = document.getElementById('hintCheckbox')?.checked ? getHintPath() : [];

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');

            // Show hint path
            if (hint.some(p => p.r === r && p.c === c)) cellDiv.classList.add('hint');

            // Render enemy
            if (enemyPos.r === r && enemyPos.c === c) {
                cellDiv.classList.add('enemy');
                cellDiv.innerText = '👾';
            } else {
                const t = grid[r][c];
                const typeClass = t === 'player' ? 'player'
                    : t === 'wall' ? 'wall'
                    : t === 'bomb' ? 'bomb'
                    : t === 'trap' ? 'trap'
                    : t === 'vtrap' ? 'vtrap'
                    : t === 'exit' ? 'exit'
                    : t === 'S' ? 'shield'
                    : t === 'D' ? 'double'
                    : t === '*' ? 'energy'
                    : 'empty';

                cellDiv.classList.add(typeClass);

                if (t === 'player') cellDiv.innerText = '🧍';
                else if (t === 'bomb') cellDiv.innerText = '💣';
                else if (t === 'trap') cellDiv.innerText = '⚠️';
                else if (t === 'vtrap') cellDiv.innerText = '☠️';
                else if (t === 'exit') cellDiv.innerText = '🏁';
                else if (t === 'S') cellDiv.innerText = '🛡️';
                else if (t === 'D') cellDiv.innerText = '⚡';
                else if (t === '*') cellDiv.innerText = '⭐';
                else cellDiv.innerText = '';
            }

            board.appendChild(cellDiv);
        }
    }

    // Update UI stats
    document.getElementById('turn').innerText = turn;
    document.getElementById('shield').innerText = shieldTurns;
    document.getElementById('doubleMove').innerText = doubleMove ? 'ON' : 'OFF';
    document.getElementById('score').innerText = score;
}

// ==================== GAME OVER ====================

/**
 * Trigger game over state
 * @param {string} emoji - Emoji to display
 * @param {string} text - Message to display
 * @param {boolean} win - Whether player won
 */
function triggerGameOver(emoji, text, win = false) {
    gameOverFlag = true;
    clearInterval(timerInterval);

    document.getElementById('gameOverEmoji').innerText = emoji;
    document.getElementById('gameOverText').innerText = text;

    const box = document.getElementById('gameOverBox');
    box.classList.remove('winBox', 'loseBox');
    box.classList.add(win ? 'winBox' : 'loseBox');

    document.getElementById('gameOverPanel').classList.remove('hidden');
    updateBestScore(score);
}

// ==================== PLAYER MOVEMENT ====================

/**
 * Move player by delta row/column
 * @param {number} dr - Delta row
 * @param {number} dc - Delta column
 */
function movePlayer(dr, dc) {
    if (gameOverFlag) return;

    const newR = playerPos.r + dr;
    const newC = playerPos.c + dc;

    // Boundary check
    if (newR < 0 || newR >= ROWS || newC < 0 || newC >= COLS) return;

    const target = grid[newR][newC];

    // Cannot walk through walls
    if (target === 'wall') return;

    // Clear previous player cell
    grid[playerPos.r][playerPos.c] = 'empty';
    playerPos = { r: newR, c: newC };

    // **Fix player invisibility:** set new cell as 'player'
    grid[playerPos.r][playerPos.c] = 'player';

    try { moveSound.play(); } catch (e) {}

    // Handle hazards and power-ups
    if (target === 'bomb' || target === 'vtrap') {
        if (shieldTurns > 0) {
            shieldTurns--;
            showMessage("🛡 Shield absorbed hazard", "teal");
        } else {
            try { hazardSound.play(); loseSound.play(); } catch (e) {}
            triggerGameOver("💥", "You hit a hazard!");
            renderBoard();
            return;
        }
    } else if (target === 'trap') {
        showMessage("⚠ Trap! Back to start.", "orange");
        playerPos = { r: 0, c: 0 };
        grid[playerPos.r][playerPos.c] = 'player';
    } else if (target === 'S') {
        shieldTurns = 3;
        showMessage("🛡 Shield collected! 3 turns", "teal");
        score += 10;
        try { powerupSound.play(); } catch (e) {}
    } else if (target === 'D') {
        doubleMove = true;
        showMessage("⚡ Double Move collected!", "orange");
        score += 10;
        try { powerupSound.play(); } catch (e) {}
    } else if (target === '*') {
        showMessage("⭐ Energy collected!", "goldenrod");
        score += 5;
        try { powerupSound.play(); } catch (e) {}
    } else if (target === 'exit') {
        try { winSound.play(); } catch (e) {}
        score += 50;
        triggerGameOver("🎉", "You Win!", true);
        return;
    }

    // Update turn and score
    turn++;
    score++;

    // Shuffle hazards randomly
    shuffleHazardsComplex();

    // Randomly spawn extra power-ups
    if (Math.random() < 0.08) {
        const c = getRandomEmptyCell();
        grid[c.r][c.c] = Math.random() < 0.5 ? '*' : 'S';
    }

    moveEnemy();
    renderBoard();
}

// ==================== ENEMY AI ====================

/**
 * Move enemy towards player with some randomness
 */
function moveEnemy() {
    if (gameOverFlag) return;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const dr = playerPos.r - enemyPos.r;
    const dc = playerPos.c - enemyPos.c;

    // 60% chance to move towards player
    if (Math.random() < 0.6) {
        if (Math.abs(dr) > Math.abs(dc)) enemyPos.r += Math.sign(dr);
        else enemyPos.c += Math.sign(dc);
    } else {
        // Random movement
        const [r, c] = dirs[Math.floor(Math.random() * dirs.length)];
        enemyPos.r = Math.max(0, Math.min(ROWS - 1, enemyPos.r + r));
        enemyPos.c = Math.max(0, Math.min(COLS - 1, enemyPos.c + c));
    }

    // Check collision with player
    if (enemyPos.r === playerPos.r && enemyPos.c === playerPos.c) triggerGameOver("☠️", "Enemy caught you!");
}

// ==================== KEYBOARD CONTROLS ====================
document.addEventListener('keydown', function (e) {
    if (gameOverFlag) return;
    let moved = false;

    if (e.key === 'w' || e.key === 'ArrowUp') { movePlayer(-1, 0); moved = true; }
    else if (e.key === 's' || e.key === 'ArrowDown') { movePlayer(1, 0); moved = true; }
    else if (e.key === 'a' || e.key === 'ArrowLeft') { movePlayer(0, -1); moved = true; }
    else if (e.key === 'd' || e.key === 'ArrowRight') { movePlayer(0, 1); moved = true; }

    if (doubleMove && moved) {
        doubleMove = false;
        showMessage("Double Move: move again!", "orange");
    }
});

// ==================== HINT TOGGLE ====================
document.getElementById('hintCheckbox')?.addEventListener('change', () => renderBoard());

// ==================== GAME OVER BUTTONS ====================
document.getElementById('restartBtn').onclick = () => location.reload();
document.getElementById('exitBtn').onclick = () => {
    gameOverFlag = true;
    clearInterval(timerInterval);
    document.getElementById('gameOverText').innerText = "👋 Thanks for playing!";
};

// ==================== MOBILE SWIPE CONTROLS ====================
let touchStartX = 0, touchStartY = 0;
document.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});
document.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) movePlayer(0, 1);
        else if (dx < -30) movePlayer(0, -1);
    } else {
        if (dy > 30) movePlayer(1, 0);
        else if (dy < -30) movePlayer(-1, 0);
    }
});

// ==================== BEST SCORE SYSTEM ====================
let bestScore = localStorage.getItem("bestScore") || 0;
document.getElementById("bestScore").innerText = bestScore;

/**
 * Update best score if current score exceeds previous
 * @param {number} s - Current score
 */
function updateBestScore(s) {
    if (s > bestScore) {
        bestScore = s;
        localStorage.setItem("bestScore", bestScore);
        document.getElementById("bestScore").innerText = bestScore;
    }
}

// ==================== INITIALIZE GAME ====================
renderBoard();
startTimer();