import { Game } from './Game';
import { Sprite } from './Sprite';
import { Particle } from './Particle';
import boboUrl from '../assets/Bobo.webp';
import cakeUrl from '../assets/Cake.webp';
import cupcakeUrl from '../assets/Cupcake.webp';
import donutUrl from '../assets/Donut.webp';
import lollipopUrl from '../assets/Lollipop.webp';
import carrotUrl from '../assets/Carrot.webp';
import eggplantUrl from '../assets/Eggplant.webp';
import capsicumUrl from '../assets/Capsicum.webp';
import broccoliUrl from '../assets/Broccoli.webp';
import pickleUrl from '../assets/Pickle.webp';
import heartUrl from '../assets/Heart.webp';
import speedUrl from '../assets/Speed.webp';

const WALK_FRAME_TIME = 0.15;
const WALK_CYCLE_FRAMES = 4;

class BoboPlayer {
    constructor(game) {
        this.game = game;
        this.scale = 0.3645 * 0.9;
        this.width = 278 * this.scale;
        this.height = 402 * this.scale;
        this.x = this.game.width / 2;
        this.groundY = this.game.height - 190;
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.gravity = 1400;
        this.jumpForce = -520;
        this.baseSpeed = 400;
        this.speed = this.baseSpeed;
        this.facingRight = true;

        // Override: one cycle of that row's WALK only while actually walking (not cycling when idle)
        this.overrideAnim = null; // { row: 1|2|3, frameIndex: 0-3, framesLeft: 4, walkTimer: 0 }

        // Speed buff from falling Speed upgrade
        this.speedBuffTimer = 0;
        this.speedBuffDuration = 5;

        this.sprite = null;
    }

    get hp() { return this.game.lives; }
    get maxHp() { return 3; }

    init(image) {
        this.sprite = new Sprite({
            image: image,
            frameWidth: 278,
            frameHeight: 402,
            scale: this.scale,
            animations: {
                idle: { row: 0, frames: 1, speed: 0.2 },
                walk: { row: 0, frames: 4, speed: WALK_FRAME_TIME }
            }
        });
    }

    update(dt) {
        const speedBonus = (this.game.runStats?.speed || 0) * 40;
        if (this.speedBuffTimer > 0) {
            this.speedBuffTimer -= dt;
            this.speed = (this.baseSpeed + speedBonus) * 1.5;
        } else {
            this.speed = this.baseSpeed + speedBonus;
        }

        this.vx = 0;
        if (this.game.input.isDown('ArrowLeft') || this.game.input.isDown('a')) {
            this.vx = -this.speed;
            this.facingRight = false;
        } else if (this.game.input.isDown('ArrowRight') || this.game.input.isDown('d')) {
            this.vx = this.speed;
            this.facingRight = true;
        }

        this.x += this.vx * dt;
        this.groundY = this.game.height - 190;
        if (this.x < this.width / 2) this.x = this.width / 2;
        if (this.x > this.game.width - this.width / 2) this.x = this.game.width - this.width / 2;

        const isGrounded = this.y >= this.groundY - 2;
        if (this.game.input.isDown(' ') || this.game.input.isDown('ArrowUp') || this.game.input.isDown('w')) {
            if (isGrounded) this.vy = this.jumpForce;
        }
        this.vy += this.gravity * dt;
        this.y += this.vy * dt;
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.vy = 0;
        }

        const isWalking = Math.abs(this.vx) > 10;

        if (this.overrideAnim) {
            if (isWalking) {
                this.overrideAnim.walkTimer += dt;
                while (this.overrideAnim.walkTimer >= WALK_FRAME_TIME && this.overrideAnim.framesLeft > 0) {
                    this.overrideAnim.walkTimer -= WALK_FRAME_TIME;
                    this.overrideAnim.frameIndex = (this.overrideAnim.frameIndex + 1) % WALK_CYCLE_FRAMES;
                    this.overrideAnim.framesLeft--;
                }
                if (this.overrideAnim.framesLeft <= 0) {
                    this.overrideAnim = null;
                    this.sprite.setAnimation('walk');
                    this.sprite.frameIndex = 0;
                } else {
                    this.sprite.setAnimation('walk');
                    this.sprite.frameIndex = this.overrideAnim.frameIndex;
                }
            } else {
                this.sprite.setAnimation('idle');
                this.sprite.frameIndex = 0;
            }
            if (this.overrideAnim) this.sprite.frameTimer = 0;
        } else {
            if (isWalking) {
                this.sprite.setAnimation('walk');
            } else {
                this.sprite.setAnimation('idle');
            }
            this.sprite.update(dt);
        }
    }

    draw(ctx) {
        const config = this.sprite.animations[this.sprite.currentAnimation];
        const origRow = config ? config.row : 0;
        if (this.overrideAnim) {
            config.row = this.overrideAnim.row;
        }
        this.sprite.draw(ctx, this.x, this.y, !this.facingRight);
        if (config) config.row = origRow;
    }

    getBasketHitbox() {
        const offsetX = this.facingRight ? 20 : -20;
        return {
            x: this.x + offsetX - 30,
            y: this.y - 40 - 20,
            w: 60,
            h: 40
        };
    }

    triggerOverride(row) {
        this.overrideAnim = {
            row,
            frameIndex: 0,
            framesLeft: WALK_CYCLE_FRAMES,
            walkTimer: 0
        };
    }

    triggerDisgust() {
        this.triggerOverride(1);
    }

    triggerHappy() {
        this.triggerOverride(2);
    }

    triggerSad() {
        this.triggerOverride(3);
    }

    applySpeedBuff(duration = 5) {
        this.speedBuffTimer = Math.max(this.speedBuffTimer, duration);
    }

    getActiveBuffs() {
        if (this.speedBuffTimer > 0) {
            return [{ type: 'speed', timeLeft: Math.ceil(this.speedBuffTimer) }];
        }
        return [];
    }
}

class FallingItem {
    constructor(game, x, type, image, speedMult = 1) {
        this.game = game;
        this.x = x;
        this.y = -50;
        this.type = type;
        this.image = image;
        this.drawScale = type === 'speed' ? 1.1 : 1;
        this.size = 50 * this.drawScale;
        this.width = this.size;
        this.height = this.size;
        let baseVy = 200 + Math.random() * 100;
        if (type === 'pickle') baseVy = 500;
        this.vy = baseVy * speedMult;

        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 5;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.rotation += this.rotSpeed * dt;
    }

    draw(ctx) {
        const half = this.size / 2;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(this.image, -half, -half, this.size, this.size);
        ctx.restore();
    }
}

export class BoboGame extends Game {
    constructor(canvas, onGameOver, onCurrencyUpdate) {
        super(canvas, onGameOver);
        this.onCurrencyUpdate = onCurrencyUpdate;

        this.player = new BoboPlayer(this);
        this.items = [];
        this.particles = [];

        this.spawnTimer = 0;
        this.spawnInterval = 1.2; // slightly slower spawn for standardized rate

        this.lives = 3;
        this.score = 0;
        this.runStats = { speed: 0 };
        this.spentCandies = 0;

        // Combo: consecutive sweets add +2 each, reset on veggie or miss
        this.consecutiveSweets = 0;

        // Pickle Rain
        this.isPickleRain = false;
        this.pickleRainTimer = 0;
        this.pickleRainDuration = 5.0;
        this.nextPickleThreshold = 100; // Every 100 points

        this.notifications = [];
        this.nextNotificationId = 0;

        this.speedSpawnTimer = 0;
    }

    buyStatUpgrade(statName) {
        if (statName !== 'speed') return false;
        const level = this.runStats.speed || 0;
        const cost = 20 + (level * 5);
        const available = this.score - this.spentCandies;
        if (available < cost) return false;
        this.spentCandies += cost;
        this.runStats.speed = level + 1;
        if (this.onCurrencyUpdate) this.onCurrencyUpdate(this.score - this.spentCandies);
        this.addNotification('Speed upgraded!', 'info');
        return true;
    }

    addNotification(text, type = 'info') {
        const duration = type === 'damage' ? 2.0 : 3.0;
        this.notifications.push({
            id: this.nextNotificationId++,
            text,
            type,
            timer: duration,
            opacity: 1
        });
        if (this.notifications.length > 10) this.notifications.shift();
    }

    getGroundTheme() {
        return 'forest';
    }

    async start() {
        super.start();
    }

    async loadAssets() {
        const load = (src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => { console.error(`Failed to load ${src}`); resolve(null); }; // Robustness
            img.src = src;
        });

        this.assets.bobo = await load(boboUrl);

        this.assets.sweets = [
            await load(cakeUrl),
            await load(cupcakeUrl),
            await load(donutUrl),
            await load(lollipopUrl)
        ];

        this.assets.veggies = [
            await load(carrotUrl),
            await load(eggplantUrl),
            await load(capsicumUrl),
            await load(broccoliUrl)
        ];

        this.assets.pickle = await load(pickleUrl);
        this.assets.heart = await load(heartUrl);
        this.assets.speed = await load(speedUrl);

        // Init player sprite
        if (this.assets.bobo) {
            this.player.init(this.assets.bobo);
        }
    }

    update(dt) {
        if (this.isPaused) return;
        super.update(dt);
        if (this.lives <= 0) return;

        this.player.update(dt);

        // Spawning
        this.spawnTimer += dt;
        // Pickle Rain Logic
        if (this.isPickleRain) {
            this.pickleRainTimer -= dt;
            if (this.pickleRainTimer <= 0) {
                this.isPickleRain = false;
                this.spawnInterval = 1.0; // Reset spawn rate
            } else {
                // Intense spawn rate
                if (this.spawnTimer > 0.1) {
                    this.spawnItem('pickle');
                    this.spawnTimer = 0;
                }
            }
        } else {
            if (this.spawnTimer > this.spawnInterval) {
                this.spawnTimer = 0;
                if (this.spawnInterval > 0.55) this.spawnInterval -= 0.01;

                const veggieChance = 0.3 + Math.min(0.35, this.score / 2500);
                const type = Math.random() < veggieChance ? 'veggie' : 'sweet';
                this.spawnItem(type);
            }

            this.speedSpawnTimer += dt;
            if (this.speedSpawnTimer >= 25 && this.assets.speed) {
                this.speedSpawnTimer = 0;
                this.spawnItem('speed');
            }
        }

        // Update Items and Collision
        const basket = this.player.getBasketHitbox();

        this.items.forEach(item => {
            item.update(dt);

            if (this.checkCollision(basket, item)) {
                this.handleCatch(item);
                item.markedForDeletion = true;
            }

            if (item.y > this.height) {
                if (item.type === 'sweet') {
                    this.consecutiveSweets = 0;
                    this.player.triggerSad();
                    const penalty = 1 + Math.floor(this.score / 300);
                    this.score = Math.max(0, this.score - penalty);
                    if (this.onCurrencyUpdate) this.onCurrencyUpdate(this.score);
                }
                item.markedForDeletion = true;
            }
        });

        this.items = this.items.filter(i => !i.markedForDeletion);

        // Update Particles
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);

        // Update notifications
        this.notifications.forEach(n => {
            n.timer -= dt;
            if (n.timer < 0.5) n.opacity = n.timer / 0.5;
        });
        this.notifications = this.notifications.filter(n => n.timer > 0);

        // Check Pickle Rain Threshold
        if (!this.isPickleRain && this.score >= this.nextPickleThreshold) {
            this.triggerPickleRain();
            this.nextPickleThreshold += 500; // Next rain at +500
        }
    }

    checkCollision(rect1, item) {
        const hw = item.width / 2;
        const hh = item.height / 2;
        const itemL = item.x - hw;
        const itemR = item.x + hw;
        const itemT = item.y - hh;
        const itemB = item.y + hh;

        return (
            rect1.x < itemR &&
            rect1.x + rect1.w > itemL &&
            rect1.y < itemB &&
            rect1.y + rect1.h > itemT
        );
    }

    handleCatch(item) {
        let points = 0;
        if (item.type === 'sweet') {
            this.consecutiveSweets++;
            points = 1 + (this.consecutiveSweets - 1); // 1,2,3,4... (standardized ~30/min)
            this.spawnConfetti(item.x, item.y);
            this.player.triggerHappy();
        } else if (item.type === 'pickle') {
            points = 2;
            this.spawnConfetti(item.x, item.y, ['#00ff00', '#ffff00']);
            this.player.triggerHappy();
        } else if (item.type === 'speed') {
            this.player.applySpeedBuff(5);
            this.addNotification('⚡ Speed boost!', 'pickle');
            item.markedForDeletion = true;
            return;
        } else if (item.type === 'veggie') {
            this.consecutiveSweets = 0;
            this.lives--;
            this.addNotification('-1 life', 'damage');
            this.player.triggerDisgust();
            if (this.lives <= 0) {
                this.onGameOver(this.score, this.score);
            }
            return;
        }

        if (points > 0) {
            this.score += points;
            if (this.onCurrencyUpdate) this.onCurrencyUpdate(this.score);
        }
    }

    spawnItem(type) {
        const x = 50 + Math.random() * (this.width - 100);
        let img;
        if (type === 'sweet') {
            img = this.assets.sweets[Math.floor(Math.random() * this.assets.sweets.length)];
        } else if (type === 'veggie') {
            img = this.assets.veggies[Math.floor(Math.random() * this.assets.veggies.length)];
        } else if (type === 'pickle') {
            img = this.assets.pickle;
        } else if (type === 'speed') {
            img = this.assets.speed;
        }

        if (img) {
            const speedMult = type === 'speed' ? 1 : (1 + this.score / 800);
            this.items.push(new FallingItem(this, x, type, img, speedMult));
        }
    }

    triggerPickleRain() {
        this.isPickleRain = true;
        this.pickleRainTimer = 5.0;
        this.spawnTimer = 0; // Immediate start
        this.addNotification('Pickle rain!', 'pickle');
    }

    getNotifications() {
        return this.notifications;
    }

    spawnConfetti(x, y, colors = null) {
        const palette = colors || ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(this, x, y, palette[Math.floor(Math.random() * palette.length)]));
        }
    }

    draw() {
        if (this.isStopped) return;

        // Draw common background logic from Game.js but override items
        super.draw(); // Draws Sky/Clouds/Ground

        // Draw additional dirt on ground? Game.js has dirt patches already.

        // Draw Bobo
        this.player.draw(this.ctx);

        // Draw Items
        this.items.forEach(i => i.draw(this.ctx));

        // Draw Particles
        this.particles.forEach(p => p.draw(this.ctx));
    }
}
