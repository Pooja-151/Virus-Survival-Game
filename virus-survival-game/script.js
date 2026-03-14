// ==== Configuration ====
// We set ROWS x COLS to 20 x 30 as requested.
const ROWS = 20;    // number of rows (vertically)
const COLS = 30;    // number of columns (horizontally)

// Counts derived from percentages (on 600 cells)
const WALLS = 35;                // static-ish walls scattered
const BOMBS = Math.round(0.10 * ROWS * COLS);  // 10% bombs => ~60
const TRAPS = Math.round(0.05 * ROWS * COLS);  // 5% traps => ~30
const VTRAPS = Math.round(0.07 * ROWS * COLS); // 7% virus => ~42

// powerups: keep tiny numbers (1-2 each)
const SHIELD_COUNT = 1;   // 🛡
const DOUBLE_COUNT = 1;   // ⚡
const ENERGY_COUNT = 1;   // ⭐

// ==== Game State ====
let grid = [];                // 2D array grid[r][c] holds strings like 'empty','player','bomb',...
let turn = 0;                 // turn counter
let score = 0;                // score tally
let playerPos = {r:0, c:0};   // player position
let shieldTurns = 0;          // shield remaining turns
let doubleMove = false;       // double-move active
let timer = 0;                // seconds
let timerInterval = null;     // interval id
let gameOverFlag = false;     // true when game has ended (win/lose) to stop moves

// ==== Sounds  ====
const moveSound = new Audio('sounds/move.mp3');
const hazardSound = new Audio('sounds/hazard.mp3');
const powerupSound = new Audio('sounds/powerup.mp3');
const winSound = new Audio('sounds/win.mp3');
const loseSound = new Audio('sounds/lose.mp3');

// ==== Utility: display inline messages ====
// Using innerHTML because we sometimes show buttons inside the message.
function showMessage(msg, color="black"){
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = msg;
    messageDiv.style.color = color;
}

// ==== Initialize grid with 'empty' ====
for(let r=0; r<ROWS; r++){
    grid[r] = [];
    for(let c=0; c<COLS; c++){
        grid[r][c] = 'empty'; // default
    }
}

// ==== Place player (top-left) and exit (bottom-right) ====
grid[0][0] = 'player';
playerPos = {r:0, c:0};
grid[ROWS-1][COLS-1] = 'exit';

// ==== Helper: getRandomEmptyCell ====
function getRandomEmptyCell(){
    while(true){
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if(grid[r][c] === 'empty') return {r, c};
    }
}

// ==== Place objects utility ====
function placeObjects(type, count){
    for(let i=0; i<count; i++){
        const cell = getRandomEmptyCell();
        grid[cell.r][cell.c] = type;
    }
}

// initial placement
placeObjects('wall', WALLS);
placeObjects('bomb', BOMBS);
placeObjects('trap', TRAPS);
placeObjects('vtrap', VTRAPS);

// place powerups individually
for(let i=0;i<SHIELD_COUNT;i++){
    const c = getRandomEmptyCell(); grid[c.r][c.c] = 'S';
}
for(let i=0;i<DOUBLE_COUNT;i++){
    const c = getRandomEmptyCell(); grid[c.r][c.c] = 'D';
}
for(let i=0;i<ENERGY_COUNT;i++){
    const c = getRandomEmptyCell(); grid[c.r][c.c] = '*';
}

// ==== Timer ====
function startTimer(){
    timerInterval = setInterval(()=>{
        timer++;
        document.getElementById('timer').innerText = timer;
    }, 1000);
}

// ==== BFS-based hint path ====
function getHintPath(){
    const visited = Array.from({length:ROWS}, ()=> Array(COLS).fill(false));
    const prev = Array.from({length:ROWS}, ()=> Array(COLS).fill(null));
    const q = [];

    q.push({r: playerPos.r, c: playerPos.c});
    visited[playerPos.r][playerPos.c] = true;

    let found = false;
    let exitPos = null;

    while(q.length > 0){
        const cur = q.shift();
        const r = cur.r, c = cur.c;

        if(grid[r][c] === 'exit'){
            found = true;
            exitPos = {r,c};
            break;
        }

        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for(const [dr,dc] of dirs){
            const nr = r + dr;
            const nc = c + dc;
            if(nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
            if(visited[nr][nc]) continue;

            const cellType = grid[nr][nc];
            if(cellType === 'wall' || cellType === 'bomb' || cellType === 'vtrap') continue;

            visited[nr][nc] = true;
            prev[nr][nc] = {r,c};
            q.push({r: nr, c: nc});
        }
    }

    if(!found) return [];

    const path = [];
    let cur = exitPos;
    while(cur && !(cur.r === playerPos.r && cur.c === playerPos.c)){
        path.push(cur);
        cur = prev[cur.r][cur.c];
    }
    return path.reverse();
}

// ==== Complex hazard shuffle ====
function shuffleHazardsComplex(){
    const fraction = 0.30;

    function collectPositions(type){
        const list = [];
        for(let r=0;r<ROWS;r++){
            for(let c=0;c<COLS;c++){
                if(grid[r][c] === type) list.push({r,c});
            }
        }
        return list;
    }

    const types = ['bomb','trap','vtrap'];

    types.forEach(type => {
        const positions = collectPositions(type);
        const moveCount = Math.max(1, Math.floor(positions.length * fraction));
        for(let i = positions.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i+1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        for(let i=0;i<moveCount && i<positions.length;i++){
            const pos = positions[i];
            grid[pos.r][pos.c] = 'empty';
            const newCell = getRandomEmptyCell();
            grid[newCell.r][newCell.c] = type;
        }
    });

    if(Math.random() < 0.12){
        const add = Math.random() < 0.6 ? 1 : 2;
        for(let i=0;i<add;i++){
            const c = getRandomEmptyCell();
            grid[c.r][c.c] = 'wall';
        }
    }
}

// ==== Render board ====
function renderBoard(){
    const boardDiv = document.getElementById('board');
    boardDiv.innerHTML = '';

    let hintPath = [];
    const hintOn = document.getElementById('hintCheckbox') && document.getElementById('hintCheckbox').checked;
    if(hintOn){
        hintPath = getHintPath();
    }

    for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');
            const cell = grid[r][c];

            if(hintPath.some(p => p.r === r && p.c === c)){
                cellDiv.classList.add('hint');
            }

            const typeClass = (cell === 'player') ? 'player' :
                              (cell === 'wall') ? 'wall' :
                              (cell === 'bomb') ? 'bomb' :
                              (cell === 'trap') ? 'trap' :
                              (cell === 'vtrap') ? 'vtrap' :
                              (cell === 'exit') ? 'exit' :
                              (cell === 'S') ? 'shield' :
                              (cell === 'D') ? 'double' :
                              (cell === '*') ? 'energy' : 'empty';
            cellDiv.classList.add(typeClass);

            if(cell === 'player') cellDiv.innerText = '🧍';
            else if(cell === 'bomb') cellDiv.innerText = '💣';
            else if(cell === 'trap') cellDiv.innerText = '⚠️';
            else if(cell === 'vtrap') cellDiv.innerText = '☠️';
            else if(cell === 'exit') cellDiv.innerText = '🏁';
            else if(cell === 'S') cellDiv.innerText = '🛡️';
            else if(cell === 'D') cellDiv.innerText = '⚡';
            else if(cell === '*') cellDiv.innerText = '⭐';
            else {
                if(hintPath.some(p => p.r === r && p.c === c)){
                    cellDiv.innerText = '·';
                } else {
                    cellDiv.innerText = '';
                }
            }

            boardDiv.appendChild(cellDiv);
        }
    }

    document.getElementById('turn').innerText = turn;
    document.getElementById('shield').innerText = shieldTurns;
    document.getElementById('doubleMove').innerText = doubleMove ? 'ON' : 'OFF';
    document.getElementById('score').innerText = score;
}

// ==== Game Over Popup (NEW) ====
function triggerGameOver(emoji, text, win=false){
    gameOverFlag = true;
    clearInterval(timerInterval);

    const panel = document.getElementById('gameOverPanel');
    const box   = document.getElementById('gameOverBox');
    const emojiBox = document.getElementById('gameOverEmoji');
    const textBox  = document.getElementById('gameOverText');

    emojiBox.innerText = emoji;
    textBox.innerText  = text;

    box.classList.remove('winBox','loseBox');
    box.classList.add(win ? 'winBox' : 'loseBox');

    panel.classList.remove('hidden');
}

// ==== Player move function ====
function movePlayer(dr, dc){
    if(gameOverFlag) return;

    const newR = playerPos.r + dr;
    const newC = playerPos.c + dc;

    if(newR < 0 || newR >= ROWS || newC < 0 || newC >= COLS) return;

    const target = grid[newR][newC];
    if(target === 'wall') return;

    grid[playerPos.r][playerPos.c] = 'empty';
    playerPos = {r: newR, c: newC};
    try { moveSound.play(); } catch(e){}

    if(target === 'bomb' || target === 'vtrap'){
        if(shieldTurns > 0){
            shieldTurns--;
            showMessage("🛡️ Shield absorbed the hazard!", "teal");
        } else {
            try { hazardSound.play(); } catch(e){}
            try { loseSound.play(); } catch(e){}
            triggerGameOver("💥", "You hit a hazard! Game Over");
            grid[playerPos.r][playerPos.c] = 'player';
            renderBoard();
            return;
        }
    } else if(target === 'trap'){
        showMessage("⚠ Trap! Back to start.", "orange");
        playerPos = {r:0, c:0};
    } else if(target === 'S'){
        shieldTurns = 3;
        showMessage("🛡️ Shield collected! 3 turns protection.", "teal");
        score += 10;
        try { powerupSound.play(); } catch(e){}
    } else if(target === 'D'){
        doubleMove = true;
        showMessage("⚡ Double Move collected! Move twice.", "orange");
        score += 10;
        try { powerupSound.play(); } catch(e){}
    } else if(target === '*'){
        showMessage("⭐ Energy collected!", "goldenrod");
        score += 5;
        try { powerupSound.play(); } catch(e){}
    } else if(target === 'exit'){
        try { winSound.play(); } catch(e){}
        score += 50;
        triggerGameOver("🎉", "You reached the Exit! You Win!", true);
        return;
    }

    grid[playerPos.r][playerPos.c] = 'player';
    turn++;
    score++;

    shuffleHazardsComplex();

    if(Math.random() < 0.08){
        if(Math.random() < 0.5){
            const c = getRandomEmptyCell(); grid[c.r][c.c] = '*';
        } else {
            const c = getRandomEmptyCell(); grid[c.r][c.c] = 'S';
        }
    }

    renderBoard();
}

// ==== Restart & Exit functions ====
function restartGame(){
    location.reload();
}
function exitGame(){
    gameOverFlag = true;
    clearInterval(timerInterval);
    showMessage("👋 You chose to exit. Refresh the page to play again.", "blue");
}

// ==== Key listener ====
function handleKey(e){
    if(gameOverFlag) return;
    let moved = false;
    if(e.key === 'w' || e.key === 'ArrowUp'){ movePlayer(-1, 0); moved = true; }
    else if(e.key === 's' || e.key === 'ArrowDown'){ movePlayer(1, 0); moved = true; }
    else if(e.key === 'a' || e.key === 'ArrowLeft'){ movePlayer(0, -1); moved = true; }
    else if(e.key === 'd' || e.key === 'ArrowRight'){ movePlayer(0, 1); moved = true; }

    if(doubleMove && moved){
        doubleMove = false;
        showMessage("Double Move: move again!", "orange");
    }
}
document.addEventListener('keydown', handleKey);

// hint toggle
const hintCheckbox = document.getElementById('hintCheckbox');
if(hintCheckbox) hintCheckbox.addEventListener('change', ()=> renderBoard());

// ==== Game Over buttons ====
document.getElementById('restartBtn').onclick = ()=> location.reload();
document.getElementById('exitBtn').onclick = ()=>{
    document.getElementById('gameOverText').innerText = "👋 Thanks for playing!";
};

// ==== Initial render ====
renderBoard();
startTimer();
