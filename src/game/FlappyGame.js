import { Game } from './Game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './Constants';
import frostiUrl from '../assets/Frosti.webp';
import candyIconUrl from '../assets/Candy Icon.webp';
import medkitUrl from '../assets/Medkit.webp';

// Breakpoints: phone < 480, tablet < 768, desktop >= 768
function getFlappyScale(width) {
    if (width < 480) return 0.6;
    if (width < 768) return 0.8;
    return 1;
}

export class FlappyGame extends Game {
    constructor(canvas, onGameOver, onCurrencyUpdate) {
        super(canvas, onGameOver);
        this.onCurrencyUpdate = onCurrencyUpdate;

        this.pipeWidthBase = 100;
        this.pipeGapBase = 250;
        this.speedBase = 300;
        this.playerWidthBase = 73.5;

        this.player = {
            x: 100,
            y: this.height / 2,
            width: 73.5,
            height: 73.5,
            velocity: 0,
            gravity: 0.15,
            jump: -5.2,
            rotation: 0,
            frame: 0,
            frameTimer: 0
        };

        this.lives = 2;
        this.maxLives = 2;
        this.invincibleUntil = 0;

        this.isGameStarted = false;

        this.pipes = [];
        this.medkits = [];
        this.pipeTimer = 0;
        this.pipeInterval = 2.0;
        this.pipeWidth = 100;
        this.pipeGap = 250;
        this.speed = 300;

        this.notifications = [];
        this.nextNotificationId = 0;

        this.applyBreakpoints();
    }

    applyBreakpoints() {
        const scale = getFlappyScale(this.width);
        this.pipeWidth = this.pipeWidthBase * scale;
        this.pipeGap = this.pipeGapBase * scale;
        this.speed = this.speedBase * scale;
        this.player.width = this.playerWidthBase * scale;
        this.player.height = this.playerWidthBase * scale;
        this.player.x = Math.min(100, 80 * scale + 20);
    }

    async loadAssets() {
        const loadImage = (src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });

        this.assets.bird = await loadImage(frostiUrl);
        this.assets.candy = await loadImage(candyIconUrl);
        this.assets.medkit = await loadImage(medkitUrl);
    }

    handleInput(type) {
        if (type === 'attack' || type === 'jump') {
            if (!this.isGameStarted) {
                this.isGameStarted = true;
            }
            this.player.velocity = this.player.jump;
        }
    }

    update(dt) {
        if (this.isStopped || this.isPaused) return;
        this.applyBreakpoints();
        super.update(dt);

        // Player physics
        if (this.isGameStarted) {
            this.player.velocity += this.player.gravity;
            this.player.y += this.player.velocity;
        } else {
            // Bobbing animation before start
            this.player.y = (this.height / 2) + Math.sin(this.survivalTime * 5) * 20;
            this.player.velocity = 0;
        }

        // Rotation based on velocity
        this.player.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.player.velocity * 0.05));

        // Animation
        this.player.frameTimer += dt;
        if (this.player.frameTimer > 0.11) { // Slowed down by 10% (was 0.1)
            this.player.frame = (this.player.frame + 1) % 3;
            this.player.frameTimer = 0;
        }

        // Screen bounds
        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocity = 0;
        }
        if (this.player.y + this.player.height > this.height) {
            this.hitObstacle();
            return;
        }

        // Pipes - only update if game has started
        if (this.isGameStarted) {
            this.pipeTimer += dt;
            if (this.pipeTimer > this.pipeInterval) {
                this.spawnPipe();
                this.pipeTimer = 0;
            }

            let pipeHit = false;
            this.pipes.forEach((pipe) => {
                pipe.x -= this.speed * dt;

                // Score check
                if (!pipe.passed && pipe.x + this.pipeWidth < this.player.x) {
                    pipe.passed = true;
                    this.score++;
                    this.currency++;
                    if (this.onCurrencyUpdate) this.onCurrencyUpdate(this.currency);
                    this.addNotification("+1 Candy!", "flappyCandy");
                }

                // Collision check (skip if invincible)
                if (this.survivalTime >= this.invincibleUntil && this.checkCollision(this.player, pipe)) {
                    pipeHit = true;
                }
            });
            this.pipes = this.pipes.filter(pipe => pipe.x + this.pipeWidth >= 0);

            if (pipeHit) {
                this.hitObstacle();
                return;
            }

            // Medkits: move and collect
            const toRemove = [];
            this.medkits.forEach((m) => {
                m.x -= this.speed * dt;
                if (m.x + 30 < 0) toRemove.push(m);
                else if (this.checkMedkitCollision(this.player, m)) {
                    this.lives = Math.min(this.maxLives, this.lives + 1);
                    toRemove.push(m);
                    this.addNotification('+1 Life!', 'flappyCandy');
                }
            });
            this.medkits = this.medkits.filter(m => !toRemove.includes(m));
        }

        // Notifications
        this.notifications.forEach((n, i) => {
            n.timer -= dt;
            if (n.timer <= 0) {
                n.opacity -= dt * 2;
                if (n.opacity <= 0) this.notifications.splice(i, 1);
            }
        });
    }

    spawnPipe() {
        const minPipeHeight = 100;
        const maxPipeHeight = this.height - this.pipeGap - minPipeHeight;
        const topPipeHeight = Math.random() * (maxPipeHeight - minPipeHeight) + minPipeHeight;

        const pipe = {
            x: this.width,
            topHeight: topPipeHeight,
            passed: false
        };
        this.pipes.push(pipe);

        // Spawn medkit in gap after 3 pipes (i.e. from 4th pipe onward)
        if (this.pipes.length >= 4) {
            this.medkits.push({
                x: this.width + this.pipeWidth / 2,
                y: topPipeHeight + this.pipeGap / 2,
                size: 36
            });
        }
    }

    hitObstacle() {
        if (this.lives > 1) {
            this.lives--;
            this.invincibleUntil = this.survivalTime + 1.2;
            this.player.y = this.height / 2;
            this.player.velocity = 0;
            this.addNotification('Ouch! ' + this.lives + ' life left', 'info');
        } else {
            this.gameOver();
        }
    }

    checkMedkitCollision(player, medkit) {
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const half = (medkit.size || 36) / 2;
        return Math.abs(px - medkit.x) < (player.width / 2 + half) &&
            Math.abs(py - medkit.y) < (player.height / 2 + half);
    }

    checkCollision(player, pipe) {
        // Player circle collider (simplified)
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const pr = player.width * 0.4;

        // Top pipe
        if (px + pr > pipe.x && px - pr < pipe.x + this.pipeWidth) {
            if (py - pr < pipe.topHeight) return true;
        }

        // Bottom pipe
        if (px + pr > pipe.x && px - pr < pipe.x + this.pipeWidth) {
            if (py + pr > pipe.topHeight + this.pipeGap) return true;
        }

        return false;
    }

    draw() {
        if (this.isStopped) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // === BLUEBERRY SKY BACKGROUND ===
        const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height);
        skyGradient.addColorStop(0, '#a2d9ff'); // Soft Sky Blue
        skyGradient.addColorStop(1, '#ffffff'); // Pure White
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw floating clouds (programmatic)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            const x = ((cloud.x + this.survivalTime * cloud.speed * 0.4) % (this.width + 300)) - 150;
            this.drawCloud(ctx, x, cloud.y, cloud.size);
        });

        // Draw Pipes
        this.pipes.forEach(pipe => {
            const bottomY = pipe.topHeight + this.pipeGap;

            // Gradient for Blue Candy look
            const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + this.pipeWidth, 0);
            pipeGradient.addColorStop(0, '#4facfe'); // Deep Pastel Blue
            pipeGradient.addColorStop(0.5, '#ffffff'); // White Core
            pipeGradient.addColorStop(1, '#4facfe'); // Deep Pastel Blue

            ctx.fillStyle = pipeGradient;
            ctx.strokeStyle = '#000000'; // Pure black outline for contrast
            ctx.lineWidth = 5;

            // 1. Draw Pipe Bodies First
            ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            ctx.strokeRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            ctx.fillRect(pipe.x, bottomY, this.pipeWidth, this.height - bottomY);
            ctx.strokeRect(pipe.x, bottomY, this.pipeWidth, this.height - bottomY);

            // 2. Draw Stripes (Clipped to bodies)
            ctx.save();
            ctx.beginPath();
            ctx.rect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            ctx.rect(pipe.x, bottomY, this.pipeWidth, this.height - bottomY);
            ctx.clip();

            ctx.strokeStyle = '#4facfe';
            ctx.lineWidth = 12;
            for (let y = -this.height; y < this.height * 2; y += 35) {
                ctx.beginPath();
                ctx.moveTo(pipe.x - 20, y);
                ctx.lineTo(pipe.x + this.pipeWidth + 20, y + 60);
                ctx.stroke();
            }
            ctx.restore();

            // 3. Draw Caps LAST (to cover any stripe spill-over)
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 5;

            // Top Cap (The "mouth" of the top pipe)
            ctx.fillRect(pipe.x - 10, pipe.topHeight - 25, this.pipeWidth + 20, 25);
            ctx.strokeRect(pipe.x - 10, pipe.topHeight - 25, this.pipeWidth + 20, 25);

            // Bottom Cap (The "mouth" of the bottom pipe)
            ctx.fillRect(pipe.x - 10, bottomY, this.pipeWidth + 20, 25);
            ctx.strokeRect(pipe.x - 10, bottomY, this.pipeWidth + 20, 25);
        });

        // Draw Medkits
        const medkitSize = 36;
        this.medkits.forEach((m) => {
            if (this.assets.medkit) {
                ctx.drawImage(
                    this.assets.medkit,
                    m.x - medkitSize / 2, m.y - medkitSize / 2,
                    medkitSize, medkitSize
                );
            } else {
                ctx.fillStyle = '#55efc4';
                ctx.beginPath();
                ctx.arc(m.x, m.y, medkitSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw Player
        ctx.save();
        ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
        ctx.rotate(this.player.rotation);

        if (this.assets.bird) {
            const frameWidth = 307;
            const frameHeight = 271;

            ctx.drawImage(
                this.assets.bird,
                this.player.frame * frameWidth, 0, frameWidth, frameHeight,
                -this.player.width / 2, -this.player.height / 2, this.player.width, this.player.height
            );
        } else {
            // Fallback
            ctx.fillStyle = '#ff6b9d';
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    addNotification(text, type = 'info') {
        this.notifications.push({
            id: this.nextNotificationId++,
            text,
            type,
            timer: type === 'info' ? 4.0 : 2.5,
            opacity: 1
        });
    }

    getNotifications() {
        return this.notifications;
    }

    gameOver() {
        if (this.isStopped) return;
        this.onGameOver(this.score, this.currency);
    }
}
