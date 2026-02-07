import { Particle } from './Particle';
import { Game } from './Game';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Medkit } from './Medkit';
import { Upgrade } from './Upgrade';
import { CANVAS_WIDTH } from './Constants';

export class PinataGame extends Game {
    constructor(canvas, onGameOver, onCurrencyUpdate) {
        super(canvas, onGameOver);
        this.onCurrencyUpdate = onCurrencyUpdate;
        this.player = null;
        this.enemies = [];
        this.medkits = [];
        this.upgrades = [];
        this.particles = [];
        this.notifications = [];
        this.enemySpawnTimer = 0;
        this.medkitSpawnTimer = 0;
        this.upgradeSpawnTimer = 0;
        this.spawnInterval = 5;
        this.killCandies = 0;
        this.spentCandies = 0; // Track candies spent on upgrades
        this.currency = 0; // The currency used for in-game upgrades
        this.nextNotificationId = 1;

        // Run-specific stats (resettable)
        this.runStats = {
            damage: 0,
            speed: 0,
            knockback: 0,
            health: 0,
            punchSpeed: 0
        };

        // Screen shake (punch only)
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0.12;

        // Combo: quick successive kills = candy multiplier + "2x" display
        this.comboCount = 0;
        this.lastKillTime = -999;
        this.comboWindow = 3; // seconds between kills to maintain combo
        this.comboDisplayTimer = 0; // show "2x" etc. for this long
    }

    triggerShake(intensity = 8, duration = 0.12) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeTimer = Math.max(this.shakeTimer, duration);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

    async start() {
        this.player = new Player(this);
        this.player.setRunStats(this.runStats);
        this.entities.push(this.player);

        super.start();
    }

    addNotification(text, type = 'info') {
        const duration = type === 'info' ? 4.0 : 2.5;
        this.notifications.push({
            id: this.nextNotificationId++,
            text,
            type,
            timer: duration,
            maxTimer: duration,
            opacity: 1
        });
        if (this.notifications.length > 10) {
            this.notifications.shift();
        }
    }

    update(dt) {
        if (this.isPaused) return;
        super.update(dt);

        // Update score/currency (standardized ~25–35/min: 1 candy per 3s + kills); clamp so it never goes negative
        const timeCandies = Math.floor(this.survivalTime / 3);
        this.currency = Math.max(0, (timeCandies + this.killCandies) - this.spentCandies);
        this.score = this.currency;

        if (!this.player || this.player.hp <= 0) return;

        // Spawning Enemies (easier first 15–20s: slower spawn, then ramp)
        this.enemySpawnTimer += dt;
        const maxEnemies = 10;
        const easeSeconds = 20;
        const earlySpawnInterval = 7;
        const effectiveSpawnInterval = this.survivalTime < easeSeconds
            ? earlySpawnInterval
            : this.spawnInterval;
        const hardThreshold = 75;
        if (this.enemySpawnTimer > effectiveSpawnInterval) {
            this.enemySpawnTimer = 0;
            if (this.enemies.length < maxEnemies) {
                this.spawnEnemy();
                if (this.survivalTime >= easeSeconds && this.spawnInterval > 0.5) {
                    const drop = this.survivalTime >= hardThreshold ? 0.1 : 0.05;
                    this.spawnInterval = Math.max(this.survivalTime >= hardThreshold ? 0.35 : 0.5, this.spawnInterval - drop);
                }
            }
        }

        // Combo: reset if too long since last kill
        if (this.survivalTime - this.lastKillTime > this.comboWindow) {
            this.comboCount = 0;
        }

        // Cleanup dead enemies and give candies (combo multiplier, no shake on kill)
        this.enemies.forEach(e => {
            if (e.isDead && !e.rewardGiven) {
                e.rewardGiven = true;

                if (this.survivalTime - this.lastKillTime <= this.comboWindow) {
                    this.comboCount++;
                } else {
                    this.comboCount = 1;
                }
                this.lastKillTime = this.survivalTime;
                this.comboDisplayTimer = 1.5;

                const baseReward = e.getReward();
                const mult = Math.min(2, 1 + (this.comboCount - 1) * 0.25);
                const reward = Math.max(1, Math.floor(baseReward * mult));

                this.killCandies += reward;
                this.currency += reward;
                if (this.onCurrencyUpdate) this.onCurrencyUpdate(this.currency);
                if (this.comboCount >= 2) {
                    this.addNotification(`${this.comboCount}x +${reward} 🍬`, 'candy');
                } else {
                    this.addNotification(`+${reward} 🍬`, 'candy');
                }
            }
        });
        this.enemies = this.enemies.filter(e => !e.isDead);

        // Spawning Medkits
        this.medkitSpawnTimer += dt;
        if (this.medkitSpawnTimer > 15) {
            this.spawnMedkit();
            this.medkitSpawnTimer = 0;
        }

        // Spawning Upgrades
        this.upgradeSpawnTimer += dt;
        if (this.upgradeSpawnTimer > 15) { // Every 15 seconds
            this.spawnUpgrade();
            this.upgradeSpawnTimer = 0;
        }

        // Check Medkit pickups
        this.medkits.forEach(m => {
            const dist = Math.abs(this.player.x - m.x);
            if (dist < 50) {
                const healAmount = m.healAmount;
                const oldHp = this.player.hp;
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                const actualHeal = this.player.hp - oldHp;

                if (actualHeal > 0) {
                    this.addNotification(`+${actualHeal} ❤️`, 'heal');
                }

                this.spawnHealEffect(this.player.x, this.player.y - 50);
                m.markedForDeletion = true;
            }
        });
        this.medkits = this.medkits.filter(m => !m.markedForDeletion);

        // Check Upgrade pickups
        this.upgrades.forEach(u => {
            const dist = Math.abs(this.player.x - u.x);
            if (dist < 50) {
                // Pass duration for time-based upgrade
                this.player.applyUpgrade(u.type, u.amount, u.duration);

                if (u.type === 'speed') {
                    this.addNotification(`⚡ Speed +${u.amount} for ${u.duration}s!`, 'info');
                } else {
                    this.addNotification(`💥 Knockback +${u.amount} for ${u.duration}s!`, 'info');
                }

                this.spawnUpgradeEffect(this.player.x, this.player.y - 50, u.type);
                u.markedForDeletion = true;
            }
        });
        this.upgrades = this.upgrades.filter(u => !u.markedForDeletion);

        // Update Particles
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);

        // Update notifications
        this.notifications.forEach(n => {
            n.timer -= dt;
            if (n.timer < 0.5) {
                n.opacity = n.timer / 0.5;
            }
        });
        this.notifications = this.notifications.filter(n => n.timer > 0);

        // Decay screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        }

        if (this.comboDisplayTimer > 0) this.comboDisplayTimer -= dt;

        this.entities = [this.player, ...this.enemies, ...this.medkits, ...this.upgrades];

        // UI is updated at the top of update() to ensure consistency

        if (this.onCurrencyUpdate) {
            this.onCurrencyUpdate(this.currency);
        }
    }

    draw() {
        const ctx = this.ctx;
        if (this.shakeTimer > 0) {
            const t = this.shakeTimer / this.shakeDuration;
            const s = this.shakeIntensity * t;
            const dx = (Math.random() - 0.5) * 2 * s;
            const dy = (Math.random() - 0.5) * 2 * s;
            ctx.save();
            ctx.translate(dx, dy);
        }
        super.draw();
        this.particles.forEach(p => p.draw(ctx));

        if (this.comboDisplayTimer > 0 && this.comboCount >= 2) {
            const t = this.comboDisplayTimer;
            const fadeInDur = 0.2;
            const fadeOutStart = 0.35;
            let alpha = 1;
            if (t > 1.5 - fadeInDur) {
                alpha = (1.5 - t) / fadeInDur;
            } else if (t < fadeOutStart) {
                alpha = t / fadeOutStart;
            }
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 52px sans-serif';
            ctx.fillStyle = '#ff6b9d';
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 5;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const comboText = `${this.comboCount}x`;
            ctx.strokeText(comboText, this.width / 2, this.height / 2 - 80);
            ctx.fillText(comboText, this.width / 2, this.height / 2 - 80);
            ctx.restore();
        }

        if (this.shakeTimer > 0) ctx.restore();
    }

    spawnEnemy() {
        const side = Math.random() > 0.5 ? -100 : this.width + 100;

        const time = this.survivalTime;

        // Randomize enemy type (variants only after 30s)
        let type = 'normal';
        if (time > 30) {
            const roll = Math.random();
            if (roll < 0.25) {
                type = 'tiny';
            } else if (roll < 0.4 && time > 60) {
                type = 'giant';
            }
        }

        // Difficulty: ease in first 20s, then ramp. After 75s spike hard so upgrades are required
        const easeSeconds = 20;
        const hardThreshold = 75;
        let difficulty;
        if (time < easeSeconds) {
            difficulty = 0.5 + 0.5 * (time / easeSeconds);
        } else if (time < hardThreshold) {
            difficulty = 1 + (time - easeSeconds) / 60;
        } else {
            const baseAt75 = 1 + (hardThreshold - easeSeconds) / 60;
            difficulty = baseAt75 + (time - hardThreshold) / 12; // steep ramp after 75s
        }

        const enemy = new Enemy(this, side, type, difficulty);
        this.enemies.push(enemy);
        this.entities.push(enemy);
    }

    spawnMedkit() {
        const x = 100 + Math.random() * (this.width - 200);
        const medkit = new Medkit(this, x);
        medkit.y = this.height - 200;
        this.medkits.push(medkit);
        this.entities.push(medkit);
        this.addNotification('💊 Medkit spawned!', 'info');
    }

    spawnUpgrade() {
        const x = 100 + Math.random() * (this.width - 200);
        const type = Math.random() > 0.5 ? 'speed' : 'knockback';
        const upgrade = new Upgrade(this, x, type);
        this.upgrades.push(upgrade);
        this.entities.push(upgrade);

        if (type === 'speed') {
            this.addNotification('⚡ Speed Upgrade spawned!', 'info');
        } else {
            this.addNotification('💥 Knockback Upgrade spawned!', 'info');
        }
    }

    spawnExplosion(x, y) {
        const colors = ['#ff6b9d', '#ffb3c6', '#ffffff', '#ffd93d', '#ff9ec4'];
        for (let i = 0; i < 25; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(this, x, y, color));
        }
    }

    spawnHealEffect(x, y) {
        const colors = ['#55efc4', '#00b894', '#ffffff', '#81ecec'];
        for (let i = 0; i < 15; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = new Particle(this, x, y, color);
            particle.vy = -Math.abs(particle.vy) - 50;
            this.particles.push(particle);
        }
    }

    spawnUpgradeEffect(x, y, type) {
        const colors = type === 'speed'
            ? ['#3498db', '#2980b9', '#ffffff', '#74b9ff']
            : ['#e74c3c', '#c0392b', '#ffffff', '#ff7675'];
        for (let i = 0; i < 20; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = new Particle(this, x, y, color);
            particle.vy = -Math.abs(particle.vy) - 80;
            this.particles.push(particle);
        }
    }

    handleInput(type) {
        if (type === 'attack' && this.player) {
            this.player.attack();
        }
    }

    buyStatUpgrade(statName) {
        const level = this.runStats[statName] || 0;
        const cost = 20 + (level * 5);

        if (this.currency >= cost) {
            this.spentCandies += cost;
            // Currency will be updated in the next loop iteration
            this.runStats[statName] = level + 1;
            if (this.player) {
                this.player.setRunStats(this.runStats);
            }
            this.addNotification(`Upgraded ${statName}!`, 'info');
            return true;
        }
        return false;
    }

    checkPlayerAttack(player) {
        const attackReach = 150;
        const damage = player.damage;

        this.enemies.forEach(d => {
            const dist = d.x - player.x;
            let hit = false;
            let knockDir = 0;

            if (player.facingRight && dist > 0 && dist < attackReach) {
                hit = true;
                knockDir = 1;
            } else if (!player.facingRight && dist < 0 && Math.abs(dist) < attackReach) {
                hit = true;
                knockDir = -1;
            }

            if (hit) {
                d.takeDamage(damage, knockDir, player.knockback); // Uses player's knockback stat
                this.triggerShake(6, 0.1);
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
            }
        });
    }

    getNotifications() {
        return this.notifications;
    }

    getPlayerHealth() {
        if (!this.player) return { hp: 0, maxHp: 100 };
        return { hp: this.player.hp, maxHp: this.player.maxHp };
    }

    triggerGameOver() {
        if (this.onGameOver) this.onGameOver(this.score, this.currency);
    }
}
