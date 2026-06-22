const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');

const tileSize = 24;
const map = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o..##................##..o#',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################'
];

const rows = map.length;
const cols = map[0].length;
const directions = {
  ArrowUp: {dx: 0, dy: -1},
  ArrowDown: {dx: 0, dy: 1},
  ArrowLeft: {dx: -1, dy: 0},
  ArrowRight: {dx: 1, dy: 0}
};

let activeDirection = null;
let score = 0;
let lastTime = 0;

const mouseSpeed = 110;

const cat = {
  row: 27,
  col: 13,
  x: 13 * tileSize + tileSize / 2,
  y: 27 * tileSize + tileSize / 2,
  dx: 0,
  dy: 0,
  speed: 160
};

const mouseSpawns = [
  {row: 14, col: 13},
  {row: 10, col: 13},
  {row: 14, col: 8},
  {row: 14, col: 18},
  {row: 8, col: 11},
  {row: 8, col: 16}
];

const mice = mouseSpawns.map((spawn, index) => ({
  spawn,
  row: spawn.row,
  col: spawn.col,
  x: spawn.col * tileSize + tileSize / 2,
  y: spawn.row * tileSize + tileSize / 2,
  dx: index % 2 === 0 ? 1 : -1,
  dy: 0,
  color: ['#f6f3ce', '#d2b0ff', '#ffb3c1', '#a6ffb2', '#ffd67f', '#80d8ff'][index],
  eaten: false,
  respawnTimer: 0
}));

function canEnter(row, col) {
  return row >= 0 && col >= 0 && row < rows && col < cols && map[row][col] !== '#';
}

function tileCenter(row, col) {
  return {
    x: col * tileSize + tileSize / 2,
    y: row * tileSize + tileSize / 2
  };
}

function currentTile(x, y) {
  return {
    row: Math.floor(y / tileSize),
    col: Math.floor(x / tileSize)
  };
}

function snapToCenter(entity) {
  const center = tileCenter(entity.row, entity.col);
  entity.x = center.x;
  entity.y = center.y;
}

function updateCat(dt) {
  const tile = currentTile(cat.x, cat.y);
  cat.row = tile.row;
  cat.col = tile.col;
  if (Math.abs(cat.x - (cat.col * tileSize + tileSize / 2)) < 2 && Math.abs(cat.y - (cat.row * tileSize + tileSize / 2)) < 2) {
    snapToCenter(cat);
    if (activeDirection) {
      const nextRow = cat.row + activeDirection.dy;
      const nextCol = cat.col + activeDirection.dx;
      if (canEnter(nextRow, nextCol)) {
        cat.dx = activeDirection.dx;
        cat.dy = activeDirection.dy;
      } else {
        cat.dx = 0;
        cat.dy = 0;
      }
    } else {
      cat.dx = 0;
      cat.dy = 0;
    }
  }

  const nextX = cat.x + cat.dx * cat.speed * dt;
  const nextY = cat.y + cat.dy * cat.speed * dt;
  const nextTile = currentTile(nextX, nextY);
  if (canEnter(nextTile.row, nextTile.col)) {
    cat.x = nextX;
    cat.y = nextY;
  } else {
    cat.dx = 0;
    cat.dy = 0;
    snapToCenter(cat);
  }
}

function chooseMouseDirection(mouse) {
  const options = [];
  for (const dir in directions) {
    const {dx, dy} = directions[dir];
    if (canEnter(mouse.row + dy, mouse.col + dx)) {
      options.push({dx, dy});
    }
  }
  if (options.length === 0) {
    mouse.dx = 0;
    mouse.dy = 0;
    return;
  }
  const reverse = {dx: -mouse.dx, dy: -mouse.dy};
  const forward = options.filter(opt => opt.dx !== reverse.dx || opt.dy !== reverse.dy);
  const pick = forward.length ? forward[Math.floor(Math.random() * forward.length)] : options[Math.floor(Math.random() * options.length)];
  mouse.dx = pick.dx;
  mouse.dy = pick.dy;
}

function resetMouse(mouse) {
  mouse.row = mouse.spawn.row;
  mouse.col = mouse.spawn.col;
  mouse.x = mouse.col * tileSize + tileSize / 2;
  mouse.y = mouse.row * tileSize + tileSize / 2;
  mouse.dx = Math.random() > 0.5 ? 1 : -1;
  mouse.dy = 0;
  mouse.eaten = false;
  mouse.respawnTimer = 0;
}

function updateMouse(mouse, dt) {
  if (mouse.eaten) {
    mouse.respawnTimer -= dt;
    if (mouse.respawnTimer <= 0) resetMouse(mouse);
    return;
  }

  const tile = currentTile(mouse.x, mouse.y);
  mouse.row = tile.row;
  mouse.col = tile.col;
  if (Math.abs(mouse.x - (mouse.col * tileSize + tileSize / 2)) < 2 && Math.abs(mouse.y - (mouse.row * tileSize + tileSize / 2)) < 2) {
    snapToCenter(mouse);
    if (!canEnter(mouse.row + mouse.dy, mouse.col + mouse.dx) || (mouse.dx === 0 && mouse.dy === 0)) {
      chooseMouseDirection(mouse);
    }
  }

  const nextX = mouse.x + mouse.dx * mouseSpeed * dt;
  const nextY = mouse.y + mouse.dy * mouseSpeed * dt;
  const nextTile = currentTile(nextX, nextY);
  if (canEnter(nextTile.row, nextTile.col)) {
    mouse.x = nextX;
    mouse.y = nextY;
  } else {
    mouse.dx = 0;
    mouse.dy = 0;
    snapToCenter(mouse);
  }
}

function update(dt) {
  updateCat(dt);
  mice.forEach(mouse => updateMouse(mouse, dt));

  mice.forEach(mouse => {
    if (mouse.eaten) return;
    const distance = Math.hypot(cat.x - mouse.x, cat.y - mouse.y);
    if (distance < tileSize * 0.7) {
      score += 1;
      scoreEl.textContent = score;
      statusEl.textContent = 'Kočička sežrala myšičku! +1 bod.';
      mouse.eaten = true;
      mouse.dx = 0;
      mouse.dy = 0;
      mouse.respawnTimer = 1.4;
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = map[row][col];
      if (tile === '#') {
        ctx.fillStyle = '#0d5fa8';
        ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        ctx.fillStyle = '#0d7ff2';
        ctx.fillRect(col * tileSize + 2, row * tileSize + 2, tileSize - 4, tileSize - 4);
      } else {
        ctx.fillStyle = '#121a2f';
        ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        if (tile === '.' || tile === 'o') {
          ctx.fillStyle = '#edf8ff';
          ctx.beginPath();
          ctx.arc(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2, tile === 'o' ? 6 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.fillStyle = '#f2a035';
  ctx.beginPath();
  ctx.arc(cat.x, cat.y, tileSize * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3cc';
  ctx.beginPath();
  ctx.arc(cat.x - 5, cat.y - 3, 4, 0, Math.PI * 2);
  ctx.arc(cat.x + 5, cat.y - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cat.x - 5, cat.y - 3, 2, 0, Math.PI * 2);
  ctx.arc(cat.x + 5, cat.y - 3, 2, 0, Math.PI * 2);
  ctx.fill();

  mice.forEach(mouse => {
    if (mouse.eaten) return;
    ctx.fillStyle = mouse.color;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, tileSize * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(mouse.x - 5, mouse.y - 2, 2, 0, Math.PI * 2);
    ctx.arc(mouse.x + 5, mouse.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
  update(dt);
  draw();
  lastTime = timestamp;
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', event => {
  if (event.key in directions) {
    activeDirection = directions[event.key];
    event.preventDefault();
  }
});

window.addEventListener('keyup', event => {
  if (event.key in directions) {
    if (activeDirection && directions[event.key] === activeDirection) {
      activeDirection = null;
    }
    event.preventDefault();
  }
});

requestAnimationFrame(gameLoop);
