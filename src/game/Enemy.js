import { Sprite } from './Sprite';
import { GROUND_Y_COORD, ENEMY_SPEED } from './Constants';

// Enemy variants
const ENEMY_TYPES = {
    normal: {
        scale: 0.35,
        hp: 50,
        speed: ENEMY_SPEED,
        knockbackMult: 1.0,
        reward: [2, 3], // candies (standardized medium rate)
    },
    tiny: {
        scale: 0.21,
        hp: 25,
        speed: ENEMY_SPEED * 1.8,
        knockbackMult: 1.5,
        reward: [1, 2],
    },
    giant: {
        scale: 0.5,
        hp: 100,
        speed: ENEMY_SPEED * 0.6,
        knockbackMult: 0.4,
        reward: [4, 6],
    }
};

export class Enemy {
    constructor(game, x, type = 'normal', difficultyMultiplier = 1.0) {
        this.game = game;
        this.x = x;
        this.type = type;

        const config = ENEMY_TYPES[type] || ENEMY_TYPES.normal;

        this.y = game.height - 195;

        // Scale HP with difficulty
        this.hp = Math.floor(config.hp * difficultyMultiplier);
        this.maxHp = this.hp;

        // Scale Speed (Tiny ones get much faster)
        let speedMult = 1.0;
        if (type === 'tiny') {
            // Tiny enemies gain 50% of the difficulty factor as extra speed
            // e.g. at 2x difficulty, they are 1.5x faster
            speedMult = 1 + (difficultyMultiplier - 1) * 0.5;
        } else {
            // Others gain 10% speed per difficulty factor
            speedMult = 1 + (difficultyMultiplier - 1) * 0.1;
        }
        this.speed = config.speed * speedMult;

        this.knockbackMult = config.knockbackMult;
        this.rewardRange = config.reward;

        this.sprite = new Sprite({
            image: game.assets.enemy,
            frameWidth: 335,
            frameHeight: 326,
            scale: config.scale,
            animations: {
                walk: { row: 0, frames: 4 },
                attack: { row: 1, frames: 2, speed: 0.12 },
            }
        });

        // Start with walk animation
        this.sprite.setAnimation('walk');

        this.state = 'walk';
        this.facingRight = false;
        this.attackRange = type === 'giant' ? 100 : (type === 'tiny' ? 60 : 80);
        const baseDamage = type === 'giant' ? 15 : (type === 'tiny' ? 5 : 10);
        this.damage = Math.max(1, Math.floor(baseDamage * difficultyMultiplier));
        this.isDead = false;
        this.rewardGiven = false;
        this.knockbackX = 0;
        this.attackCooldown = 0;
        this.attackTimer = 0;
        this.hasDealtDamage = false;

        // Death animation
        this.deathTimer = 0;
        this.deathDuration = 0.5;
    }

    // Get reward candies for this enemy type
    getReward() {
        const [min, max] = this.rewardRange;
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    update(dt) {
        // Death animation
        if (this.hp <= 0 && !this.isDead) {
            this.deathTimer += dt;
            if (this.deathTimer >= this.deathDuration) {
                this.isDead = true;
                this.game.spawnExplosion(this.x, this.y - 50);
            }
            return;
        }

        if (this.isDead) return;

        // Cooldown Timer
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        // Attack state
        if (this.state === 'attack') {
            this.attackTimer += dt;
            this.sprite.update(dt);

            // Deal damage mid-attack
            if (this.attackTimer >= 0.25 && !this.hasDealtDamage) {
                this.hasDealtDamage = true;
                const player = this.game.player;
                const dist = Math.abs(player.x - this.x);
                const groundY = this.game.height - 200;
                const isPlayerTooHigh = player.y < groundY - 60; // Dodge if jumping high enough

                if (player && player.hp > 0 && dist < this.attackRange && !isPlayerTooHigh) {
                    player.takeDamage(this.damage);
                }
            }

            // End attack
            if (this.attackTimer >= 0.5) {
                this.state = 'walk';
                this.hasDealtDamage = false;
                this.sprite.setAnimation('walk', true, null, true);
            }
            return;
        }

        // Knockback
        if (Math.abs(this.knockbackX) > 10) {
            this.x += this.knockbackX * dt;
            this.knockbackX *= 0.9;
        }

        // AI movement
        if (Math.abs(this.knockbackX) < 50) {
            const player = this.game.player;
            if (!player || player.hp <= 0) return;

            const dist = player.x - this.x;
            this.facingRight = dist > 0;

            if (Math.abs(dist) < this.attackRange && this.attackCooldown <= 0) {
                this.attack();
            } else {
                // Move towards player using type-specific speed
                const dir = Math.sign(dist);
                this.x += dir * this.speed * dt;
                if (this.state !== 'walk') {
                    this.sprite.setAnimation('walk');
                }
            }
        }

        this.sprite.update(dt);
    }

    attack() {
        this.state = 'attack';
        this.attackTimer = 0;
        this.hasDealtDamage = false;
        this.attackCooldown = this.type === 'giant' ? 2.5 : (this.type === 'tiny' ? 1.0 : 2.0);
        this.sprite.setAnimation('attack', false, null, true);
    }

    takeDamage(amount, knockbackDir = 0, knockbackPower = 400) {
        this.hp -= amount;
        if (knockbackDir !== 0) {
            // Apply knockback multiplier based on type
            this.knockbackX = knockbackDir * knockbackPower * this.knockbackMult;
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        if (this.hp <= 0) {
            ctx.globalAlpha = 1 - (this.deathTimer / this.deathDuration);
        }

        this.sprite.draw(ctx, this.x, this.y, !this.facingRight);

        // Health Bar - size based on enemy type
        const barWidth = this.type === 'giant' ? 80 : (this.type === 'tiny' ? 40 : 60);
        const barHeight = 8;
        const yOffset = this.type === 'giant' ? 180 : (this.type === 'tiny' ? 100 : 150);
        const xStart = this.x - barWidth / 2;
        const yStart = this.y - yOffset;

        ctx.fillStyle = '#2d2d2d';
        ctx.beginPath();
        ctx.roundRect(xStart - 3, yStart - 3, barWidth + 6, barHeight + 6, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(xStart - 1, yStart - 1, barWidth + 2, barHeight + 2, 5);
        ctx.fill();

        // Color based on type
        const barColor = this.type === 'giant' ? '#9b59b6' : (this.type === 'tiny' ? '#3498db' : '#ff6b9d');
        const currentWidth = Math.max(0, barWidth * (this.hp / this.maxHp));
        ctx.fillStyle = barColor;
        ctx.beginPath();
        ctx.roundRect(xStart, yStart, currentWidth, barHeight, 4);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}
