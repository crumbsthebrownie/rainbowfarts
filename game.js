const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const nicknameInput = document.getElementById('nicknameInput');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const submitStatus = document.getElementById('submitStatus');
const leaderboardEntries = document.getElementById('leaderboardEntries');
const startLeaderboardEntries = document.getElementById('startLeaderboardEntries');
const pauseBtn = document.getElementById('pauseBtn');

const API_URL = 'https://fart-rocket-leaderboard.ian-link.workers.dev/api/scores';

const SILLY_NAMES = [
  'Captain Farts', 'Star Sniffer', 'Cloud Crusher',
  'Rainbow Rocket', 'Poochie Power', 'Mega Fartron',
  'Sky Banana', 'Cosmic Pooper', 'Fluffy Destroyer',
  'Super SBD', 'The Brown Bomber', 'Gas Giant',
  'Booty Blaster', 'Thunder Bum', "Neptune's Nose",
  'Flatulon', 'Rocket Rump', 'The Wind Master',
  'Stink Star', 'Pluto\'s Pet',
];

let gameState = 'start';
let countdownTimer = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('fartRocketHighScore')) || 0;
let gameSpeed = 3;
let frameCount = 0;

highScoreEl.textContent = `Best: ${highScore}`;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Player {
    constructor() {
        this.width = 40;
        this.height = 60;
        this.x = canvas.width * 0.2;
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.gravity = 0.5;
        this.boost = -12;
        this.isBoosting = false;
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
        if (this.y + this.height > canvas.height) {
            gameOver();
        }
    }

    boostUp() {
        this.velocity = this.boost;
        this.isBoosting = true;
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(this.x, this.y + this.height, 'fart'));
        }
    }

    draw() {
        ctx.save();
        
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height/2, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y);
        ctx.lineTo(this.x + this.width/2 - 10, this.y + 15);
        ctx.lineTo(this.x + this.width/2 + 10, this.y + 15);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#444';
        ctx.fillRect(this.x + this.width/2 - 3, this.y + 20, 6, 15);

        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(this.x + this.width/2 + 5, this.y + 10, 8, 5);
        ctx.fillRect(this.x + this.width/2 - 13, this.y + 10, 8, 5);

        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2 - 8, this.y + 30, 5, 0, Math.PI * 2);
        ctx.arc(this.x + this.width/2 + 8, this.y + 30, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2 - 8, this.y + 30, 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.width/2 + 8, this.y + 30, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class Obstacle {
    constructor() {
        this.width = 50 + Math.random() * 30;
        this.height = 40 + Math.random() * 30;
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - this.height);
        this.type = Math.random() > 0.5 ? 'cloud' : 'bird';
        this.color = this.type === 'cloud' ? '#ffffff' : '#ff6b6b';
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        ctx.save();
        if (this.type === 'cloud') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/3, 0, Math.PI * 2);
            ctx.arc(this.x + this.width/3, this.y + this.height/2 - 5, this.width/4, 0, Math.PI * 2);
            ctx.arc(this.x + this.width*2/3, this.y + this.height/2 - 5, this.width/4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height/2);
            ctx.quadraticCurveTo(this.x + this.width/2, this.y, this.x + this.width, this.y + this.height/2);
            ctx.quadraticCurveTo(this.x + this.width/2, this.y + this.height, this.x, this.y + this.height/2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.x + 15, this.y + this.height/2 - 3, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class Star {
    constructor() {
        this.size = 20;
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - 100) + 50;
        this.rotation = 0;
        this.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
    }

    update() {
        this.x -= gameSpeed;
        this.rotation += 0.05;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5;
            const radius = i % 2 === 0 ? this.size : this.size / 2;
            if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 15 + 5;
        this.speedX = Math.random() * -3 - 1;
        this.speedY = (Math.random() - 0.5) * 2;
        this.opacity = 1;
        this.type = type;
        
        if (type === 'fart') {
            const colors = ['#FFB6C1', '#FFC0CB', '#FFDAB9', '#FFFACD', '#E6E6FA'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= 0.02;
        this.size += 0.3;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let player;
let obstacles = [];
let stars = [];
let particles = [];
let obstacleTimer = 0;
let starTimer = 0;
let currentSillyName = '';
let scoreSubmitted = false;

function generateSillyName() {
  const name = SILLY_NAMES[Math.floor(Math.random() * SILLY_NAMES.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${name}#${num}`;
}

async function fetchLeaderboard() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function submitScore(name, score) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function renderLeaderboard(scores) {
  const html = !scores || scores.length === 0
    ? '<div class="lb-empty">No scores yet — be the first!</div>'
    : scores
      .map((s, i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        return `<div class="lb-entry">
          <span class="lb-rank ${rankClass}">#${i + 1}</span>
          <span class="lb-name">${escapeHtml(s.name)}</span>
          <span class="lb-score">${s.score.toLocaleString()}</span>
        </div>`;
      })
      .join('');

  leaderboardEntries.innerHTML = html;
  if (startLeaderboardEntries) startLeaderboardEntries.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function init() {
    player = new Player();
    obstacles = [];
    stars = [];
    particles = [];
    score = 0;
    gameSpeed = 3;
    obstacleTimer = 0;
    starTimer = 0;
    frameCount = 0;
    scoreEl.textContent = `Score: ${score}`;
}

function spawnObstacle() {
    obstacles.push(new Obstacle());
}

function spawnStar() {
    stars.push(new Star());
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#E6E6FA');
    gradient.addColorStop(1, '#DDA0DD');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 5; i++) {
        const x = ((frameCount * 0.5 + i * 200) % (canvas.width + 100)) - 50;
        const y = 50 + i * 80;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fill();
    }
}

function update() {
    if (gameState === 'countdown') {
        countdownTimer--;
        if (countdownTimer <= 0) {
            gameState = 'playing';
            pauseBtn.classList.remove('hidden');
        }
        return;
    }
    if (gameState !== 'playing') return;

    frameCount++;
    
    if (frameCount % 500 === 0) {
        gameSpeed += 0.3;
    }

    player.update();

    obstacleTimer++;
    if (obstacleTimer > 100 - gameSpeed * 5) {
        spawnObstacle();
        obstacleTimer = 0;
    }

    starTimer++;
    if (starTimer > 80) {
        spawnStar();
        starTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            continue;
        }
        if (checkCollision(player, obstacles[i])) {
            gameOver();
            return;
        }
    }

    for (let i = stars.length - 1; i >= 0; i--) {
        stars[i].update();
        if (stars[i].x + stars[i].size < 0) {
            stars.splice(i, 1);
            continue;
        }
        const starRect = { x: stars[i].x - stars[i].size, y: stars[i].y - stars[i].size, width: stars[i].size * 2, height: stars[i].size * 2 };
        if (checkCollision(player, starRect)) {
            score += 10;
            scoreEl.textContent = `Score: ${score}`;
            for (let j = 0; j < 8; j++) {
                particles.push(new Particle(stars[i].x, stars[i].y, 'star'));
            }
            stars.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].opacity <= 0) {
            particles.splice(i, 1);
        }
    }

    score++;
    if (score % 10 === 0) {
        scoreEl.textContent = `Score: ${score}`;
    }
}

function draw() {
    drawBackground();

    particles.forEach(p => p.draw());
    stars.forEach(s => s.draw());
    obstacles.forEach(o => o.draw());
    
    if (gameState === 'playing' || gameState === 'countdown' || gameState === 'paused') {
        player.draw();
    }

    if (gameState === 'countdown') {
        const seconds = Math.ceil(countdownTimer / 60);
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seconds, canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }

    if (gameState === 'paused') {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '24px Arial';
        ctx.fillText('Press Esc or tap ▶ to resume', canvas.width / 2, canvas.height / 2 + 40);
        ctx.restore();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameState = 'countdown';
    countdownTimer = 300;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    init();
    fetchLeaderboard().then((scores) => renderLeaderboard(scores));
}

function gameOver() {
    gameState = 'gameover';
    pauseBtn.classList.add('hidden');
    pauseBtn.textContent = '⏸';
    scoreSubmitted = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('fartRocketHighScore', highScore);
        highScoreEl.textContent = `Best: ${highScore}`;
    }

    finalScoreEl.textContent = `Score: ${score}`;

    currentSillyName = generateSillyName();
    const savedNickname = localStorage.getItem('fartRocketNickname');
    nicknameInput.value = savedNickname || '';
    nicknameInput.placeholder = savedNickname ? 'Edit your nickname' : `e.g. ${currentSillyName}`;
    submitScoreBtn.disabled = false;
    submitScoreBtn.textContent = 'SUBMIT SCORE';
    submitStatus.textContent = '';
    gameOverScreen.classList.remove('hidden');

    fetchLeaderboard().then((scores) => renderLeaderboard(scores));
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        pauseBtn.textContent = '▶';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        pauseBtn.textContent = '⏸';
    }
}

async function handleScoreSubmit() {
  if (scoreSubmitted) return;
  scoreSubmitted = true;
  submitScoreBtn.disabled = true;
  submitScoreBtn.textContent = 'SUBMITTING...';
  submitStatus.textContent = '';

  const customName = nicknameInput.value.trim();
  const name = customName || currentSillyName;

  if (customName) {
    localStorage.setItem('fartRocketNickname', customName);
  } else {
    localStorage.removeItem('fartRocketNickname');
  }

  const result = await submitScore(name, score);

  if (result && result.success) {
    submitStatus.textContent = `Score submitted! Rank: #${result.rank}`;
    const scores = await fetchLeaderboard();
    renderLeaderboard(scores);
  } else {
    submitStatus.textContent = 'Could not reach leaderboard. Try again later.';
    scoreSubmitted = false;
    submitScoreBtn.disabled = false;
    submitScoreBtn.textContent = 'SUBMIT SCORE';
  }
}

function handleInput(e) {
    if ((e.type === 'keydown' && e.code === 'Space') || 
        (e.type === 'click' || e.type === 'touchstart')) {
        if (gameState === 'playing') {
            player.boostUp();
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleInput(e);
    }
    if (e.code === 'Escape') {
        togglePause();
    }
});

canvas.addEventListener('click', handleInput);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput(e);
});

pauseBtn.addEventListener('click', togglePause);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
submitScoreBtn.addEventListener('click', handleScoreSubmit);

fetchLeaderboard().then((scores) => renderLeaderboard(scores));

gameLoop();
