import { Player } from "./player.js";
import { FloatingNumber } from './floatingNumber.js';
import { Enemy } from "./enemy.js";
import { distanceBetweenTwoPoints } from "./utilities.js";
import { Weapon } from "./weapon.js";
import { UpgradeSystem } from './upgradeSystem.js';

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;

const scoreEl = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');

let player;
let upgradeSystem;
let weapon = new Weapon(500, 10, 0, false, false, false, false);
const projectiles = [];
let floatingNumbers = [];
let enemies = [];
let particles = [];
let score = 0;
let animationId;
let countIntervalId;
let spawnIntervalId;

const gameOverGifs = [
  'dance.gif',
  'el-primo.gif',
  'rat.gif',
  'spongebob.gif',
  'sunflower.gif',
];

let difficultyConstant = 0;
const difficultyStat = document.getElementById('difficultyStat');

const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', () => {
  startBtn.classList.add('d-none');
  init();
  animate();
  spawnEnemies();

  const bgMusic = new Audio('./sounds/bg.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.3;
  bgMusic.play(); 
});

function init() {
  const movementLimits = {
    minX: 0,
    maxX: canvas.width,
    minY: 0,
    maxY: canvas.height,
  };

  player = new Player(canvas.width / 2, canvas.height / 2, context, movementLimits, weapon, floatingNumbers);

  window.addEventListener("mousedown", () => {
    player.shoot(null, null, context, projectiles);
  });

  window.addEventListener("mouseup", () => {
    player.stopShooting();
  });

  window.addEventListener("mouseleave", () => {
    player.stopShooting();
  });

  window.addEventListener("mousemove", (e) => {
    player.cursorPosition.x = e.clientX;
    player.cursorPosition.y = e.clientY;
  });

  upgradeSystem = new UpgradeSystem(
    player,
    animate,
    spawnEnemies
  );
}

function spawnEnemies() {
  let baseCount = 1;
  let countOfSpawnEnemies = baseCount;

  countIntervalId = setInterval(() => countOfSpawnEnemies++, 30000);

  if (spawnIntervalId) clearInterval(spawnIntervalId);

  let spawnIntervalDuration = 1000 - difficultyConstant * 800;
  spawnIntervalDuration = Math.max(spawnIntervalDuration, 200);

  spawnIntervalId = setInterval(() => {
    spawnCountEnemies(countOfSpawnEnemies);
  }, spawnIntervalDuration);

  spawnCountEnemies(countOfSpawnEnemies);
}

function spawnCountEnemies(count) {
  for (let i = 0; i < count; i++) {
    enemies.push(new Enemy(canvas.width, canvas.height, context, player, difficultyConstant, floatingNumbers));
  }
}

function animate() {
  animationId = requestAnimationFrame(animate);
  context.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter(p => p.alpha > 0);
  projectiles.splice(0, projectiles.length, ...projectiles.filter(projectileInsideWindow));
  enemies = enemies.filter(enemy => enemy.health > 0);
  enemies.forEach(enemy => checkHittingEnemy(enemy));
  enemies = enemies.filter(enemy => !enemy._isDead);
  enemies.forEach((enemy, index) => checkHittingPlayer(enemy, index));

  particles.forEach(particle => particle.update());
  projectiles.forEach(projectile => projectile.update(enemies));
  player.update();
  enemies.forEach(enemy => enemy.update({
    increaseScore: () => increaseScore(score),
    updateScore: (points) => { score += points },
    particles: particles
  }));

  floatingNumbers = floatingNumbers.filter(floatingNumber => floatingNumber.alpha > 0);
  floatingNumbers.forEach(floatingNumber => {
    floatingNumber.update();
    floatingNumber.draw();
  });
}

function projectileInsideWindow(projectile) {
  return projectile.x + projectile.radius > 0 &&
    projectile.x - projectile.radius < canvas.width &&
    projectile.y + projectile.radius > 0 &&
    projectile.y - projectile.radius < canvas.height
}

function checkHittingPlayer(enemy, index) {
  const distance = distanceBetweenTwoPoints(player.x, player.y, enemy.x, enemy.y);
  const isColliding = distance - enemy.radius - player.radius < 0;

  if (isColliding) {

    const damageSound = new Audio('./sounds/damage.mp3');
    damageSound.play();

    player.currentHealth -= 25;
    floatingNumbers.push(new FloatingNumber(player.x, player.y, 25, 'damage', context));
    enemies.splice(index, 1);

    if (player.currentHealth <= 0) {
      const deathSound = new Audio('./sounds/death.mp3');
      deathSound.play();

      const randomGif = gameOverGifs[Math.floor(Math.random() * gameOverGifs.length)];
      const gifElement = document.getElementById('game-over-gif');
      gifElement.src = `./img/game_over_gifs/${randomGif}`;

      gameOverScreen.classList.replace('d-none', 'd-flex');
      clearInterval(countIntervalId);
      clearInterval(spawnIntervalId);
      cancelAnimationFrame(animationId);
    }
  }

  return false;
}

function checkHittingEnemy(enemy) {
  projectiles.forEach((projectile, index) => {
    if (projectile.hitEnemies.has(enemy)) return false;

    const distance = distanceBetweenTwoPoints(projectile.x, projectile.y, enemy.x, enemy.y);
    if (distance - enemy.radius - projectile.radius > 0) return false;

    projectile.hitEnemies.add(enemy);

    if (player.weapon.fireBullet) {
      enemy.setOnFire();
    }

    const damageSound = new Audio('./sounds/damage.mp3');
    damageSound.play();

    enemy.health -= player.weapon.damage;
    floatingNumbers.push(new FloatingNumber(enemy.x, enemy.y, player.weapon.damage, 'damage', context));

    if (projectile.canSplit) {
      projectile.split(projectiles);
    }

    
    if (projectile.enemiesPenetrated < player.weapon.penetrate) {
      projectile.enemiesPenetrated++;
    } else {
      removeProjectileByIndex(index);
    }
  });

  if (enemy.health <= 0) {
    enemy.die({
      updateScore: (points) => { score += points },
      increaseScore: () => increaseScore(score),
      particles: particles
    });
  }
  return true;
}

function removeProjectileByIndex(index) {
  projectiles.splice(index, 1);
}

function increaseScore(score = 0) {
  scoreEl.innerHTML = score;

  const progressEl = document.getElementById('score-progress');
  const progress = score - upgradeSystem.previousUpgradeAt;
  const needed = upgradeSystem.nextUpgradeAt - upgradeSystem.previousUpgradeAt;
  const percent = Math.min((progress / needed) * 100, 100);

  progressEl.style.width = `${percent}%`;
  progressEl.textContent = `${Math.floor(percent)}%`;

  if (upgradeSystem.checkForUpgrade(score)) {
    cancelAnimationFrame(animationId);
    clearInterval(spawnIntervalId);
    difficultyConstant = Math.min(1, difficultyConstant + 0.1);
    difficultyStat.textContent = Math.round(difficultyConstant * 100);
  }
}
