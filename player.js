import { FloatingNumber } from './floatingNumber.js';

const MOVE_UP_KEY_CODES = ["ArrowUp", "KeyW"];
const MOVE_DOWN_KEYS_CODES = ["ArrowDown", "KeyS"];
const MOVE_LEFT_KEYS_CODES = ["ArrowLeft", "KeyA"];
const MOVE_RIGHT_KEYS_CODES = ["ArrowRight", "KeyD"];
const ALL_MOVE_KEY_CODES = [...MOVE_UP_KEY_CODES, ...MOVE_DOWN_KEYS_CODES, ...MOVE_LEFT_KEYS_CODES, ...MOVE_RIGHT_KEYS_CODES];

export class Player {
  constructor(x, y, context, movementLimits, weapon=null, floatingNumbers=null) {
    this.radius = 15;
    this.velocity = 3;

    this.x = x;
    this.y = y;
    this.context = context;
    this.cursorPosition = {
      x: 0,
      y: 0
    };
    this.movementLimits = {
      minX: movementLimits.minX + this.radius,
      maxX: movementLimits.maxX - this.radius,
      minY: movementLimits.minY + this.radius,
      maxY: movementLimits.maxY - this.radius,
    };

    this.keyMap = new Map();
    document.addEventListener("mousemove", (event => {
      this.cursorPosition.x = event.clientX;
      this.cursorPosition.y = event.clientY;
    }));
    document.addEventListener("keydown", (event) => this.keyMap.set(event.code, true));
    document.addEventListener("keyup", (event) => this.keyMap.delete(event.code));

    this.image = new Image();
    this.image.src = "./img/player.png";
    this.imageWidth = 50;
    this.imageHeight = 60;
    this.isMoving = false;
    this.imageTick = 0;

    this.weapon = weapon;

    this.maxHealth = 100;
    this.currentHealth = 100;

    this.regen = 0;
    this._lastRegenTime = 0;
    this.healthStat = document.getElementById('healthStat');
    this.floatingNumbers = floatingNumbers;
  }

  setWeapon(weapon) {
    this.weapon = weapon;
  }

  shoot(targetX, targetY, context, projectiles) {
    this.weapon.onMouseDown(this, targetX, targetY, context, projectiles);
  }

  stopShooting() {
    if (this.weapon) {
      this.weapon.onMouseUp();
    }
  }

  drawImg() {
    const imageTickLimit = 18;
    let subX = 0;
    if (!this.isMoving) {
      subX = 0;
      this.imageTick = 0;
    } else {
      subX = this.imageTick > imageTickLimit ? this.imageWidth * 2 : this.imageWidth;
      this.imageTick++;
    }
    if (this.imageTick > imageTickLimit * 2) {
      this.imageTick = 0;
    }

    this.context.drawImage(
      this.image,
      subX,
      0,
      this.imageWidth,
      this.imageHeight,
      this.x - this.imageWidth / 2,
      this.y - this.imageHeight / 2,
      this.imageWidth,
      this.imageHeight);
  }

  drawHealthBar() {
    const barWidth = 50;
    const barHeight = 6;
    const x = this.x - barWidth / 2;
    const y = this.y - this.imageHeight / 2 - 10;

    this.context.fillStyle = 'gray';
    this.context.fillRect(x, y, barWidth, barHeight);

    const healthWidth = (this.currentHealth / this.maxHealth) * barWidth;
    this.context.fillStyle = 'limegreen';
    this.context.fillRect(x, y, healthWidth, barHeight);

    this.context.strokeStyle = 'black';
    this.context.strokeRect(x, y, barWidth, barHeight);
  }

  draw() {
    this.context.save();
    let angle = Math.atan2(this.cursorPosition.y - this.y, this.cursorPosition.x - this.x);
    this.context.translate(this.x, this.y);
    this.context.rotate(angle + Math.PI / 2);
    this.context.translate(-this.x, -this.y);
    this.drawImg();
    this.context.restore();

    this.drawHealthBar();
  }

  regenerateHealth(currentTime = performance.now()) {
    if (this.regen > 0) {
      const deltaTime = (currentTime - this._lastRegenTime) / 1000;
      if (deltaTime >= 1 && this.currentHealth < this.maxHealth) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + this.regen);
        this._lastRegenTime = currentTime;
        this.floatingNumbers.push(new FloatingNumber(this.x, this.y, 1, 'heal', this.context));
      }
    }
  }

  update() {
    this.draw();
    this.isMoving = this.shouldMove(ALL_MOVE_KEY_CODES);
    this.updatePosition();
    this.checkPositionLimitAndUpdate();
    this.regenerateHealth();
    this.healthStat.innerText = this.currentHealth;
    if (this.floatingNumbers){
      this.floatingNumbers = this.floatingNumbers.filter(floatingNumber => floatingNumber.alpha > 0);
      this.floatingNumbers.forEach(floatingNumber => {
        floatingNumber.update();
        floatingNumber.draw();
      });
    }
  }

  updatePosition() {
    if (this.shouldMove(MOVE_UP_KEY_CODES)) this.y -= this.velocity;
    if (this.shouldMove(MOVE_DOWN_KEYS_CODES)) this.y += this.velocity;
    if (this.shouldMove(MOVE_LEFT_KEYS_CODES)) this.x -= this.velocity;
    if (this.shouldMove(MOVE_RIGHT_KEYS_CODES)) this.x += this.velocity;
  }

  checkPositionLimitAndUpdate() {
    if (this.y < this.movementLimits.minY) this.y = this.movementLimits.minY;
    if (this.y > this.movementLimits.maxY) this.y = this.movementLimits.maxY;
    if (this.x < this.movementLimits.minX) this.x = this.movementLimits.minX;
    if (this.x > this.movementLimits.maxX) this.x = this.movementLimits.maxX;
  }

  shouldMove(keys) {
    return keys.some(key => this.keyMap.get(key));
  }
}