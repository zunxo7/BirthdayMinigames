import { InputHandler } from './InputHandler';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './Constants';
import crumbUrl from '../assets/Crumb.webp';
import enemyUrl from '../assets/Evil Pinata.webp';
import candyUrl from '../assets/Candy Icon.webp';
import medkitUrl from '../assets/Medkit.webp';
import speedUrl from '../assets/Speed.webp';
import knockbackUrl from '../assets/Knockback.webp';

export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.onGameOver = onGameOver;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.resizeHandler = () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        };
        window.addEventListener('resize', this.resizeHandler);

        this.lastTime = 0;
        this.accumulator = 0;
        this.step = 1 / 60;
        this.isRunning = false;
        this.isStopped = false; // Permanent stop flag
        this.isPaused = false; // Temporary pause flag

        this.input = new InputHandler();
        this.entities = [];
        this.assets = {};

        // Game State
        this.score = 0;
        this.currency = 0;
        this.survivalTime = 0;

        // Decorations
        this.flowers = this.generateFlowers();
        this.clouds = this.generateClouds();
        this.grassBlades = this.generateGrass();
    }

    generateFlowers() {
        const flowers = [];
        const types = ['🌸', '🌷', '🌺', '🌻', '💮', '🌼'];
        for (let i = 0; i < 25; i++) {
            flowers.push({
                x: Math.random() * 3000,
                type: types[Math.floor(Math.random() * types.length)],
                size: 16 + Math.random() * 12,
                yOffset: 15 + Math.random() * 30
            });
        }
        return flowers;
    }

    generateClouds() {
        const clouds = [];
        for (let i = 0; i < 8; i++) {
            clouds.push({
                x: Math.random() * 2000,
                y: 50 + Math.random() * 150,
                size: 40 + Math.random() * 60,
                speed: 10 + Math.random() * 20
            });
        }
        return clouds;
    }

    generateGrass() {
        const grass = [];
        for (let i = 0; i < 150; i++) {
            grass.push({
                x: Math.random() * 3000,
                height: 15 + Math.random() * 25,
                width: 3 + Math.random() * 4,
                sway: Math.random() * Math.PI * 2
            });
        }
        return grass;
    }

    async loadAssets() {
        const loadImage = (src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });

        this.assets.crumb = await loadImage(crumbUrl);
        this.assets.enemy = await loadImage(enemyUrl);
        this.assets.candy = await loadImage(candyUrl);
        this.assets.medkit = await loadImage(medkitUrl);
        this.assets.speed = await loadImage(speedUrl);
        this.assets.knockback = await loadImage(knockbackUrl);
    }

    start() {
        if (this.isStopped) return; // Don't start if permanently stopped
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    stop() {
        this.isRunning = false;
        this.isStopped = true; // Permanently stopped
        this.input.destroy();
        window.removeEventListener('resize', this.resizeHandler);
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        if (this.isPaused && !this.isStopped) {
            this.isPaused = false;
            this.lastTime = performance.now(); // Reset lastTime to avoid huge dt after pause
        }
    }

    loop(timestamp) {
        if (!this.isRunning || this.isStopped) return;

        let dt = (timestamp - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        if (this.isRunning && !this.isStopped) {
            requestAnimationFrame(this.loop.bind(this));
        }
    }

    update(dt) {
        if (this.isStopped || this.isPaused) return;
        this.survivalTime += dt;
        this.entities.forEach(e => e.update(dt));
    }

    getGroundTheme() {
        return 'default';
    }

    getNotifications() {
        return [];
    }

    draw() {
        if (this.isStopped) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const groundY = this.height - 200;
        const isForest = this.getGroundTheme() === 'forest';

        // === SKY ===
        const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
        if (isForest) {
            skyGradient.addColorStop(0, '#b8e4f5');
            skyGradient.addColorStop(0.5, '#a8dcee');
            skyGradient.addColorStop(0.85, '#9dd4e8');
            skyGradient.addColorStop(1, '#8fcce3');
        } else {
            skyGradient.addColorStop(0, '#fff5f8');
            skyGradient.addColorStop(0.4, '#ffe6ed');
            skyGradient.addColorStop(0.7, '#ffc1d4');
            skyGradient.addColorStop(1, '#ffb3c6');
        }
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.width, groundY);

        // === CLOUDS ===
        ctx.fillStyle = isForest ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        this.clouds.forEach(cloud => {
            const x = ((cloud.x + this.survivalTime * cloud.speed) % (this.width + 200)) - 100;
            this.drawCloud(ctx, x, cloud.y, cloud.size);
        });

        // === HILLS ===
        ctx.fillStyle = isForest ? '#b8c9b0' : '#ffd6e0';
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        for (let x = 0; x <= this.width; x += 80) {
            const hillHeight = 40 + Math.sin(x * 0.004 + 1) * 25 + Math.sin(x * 0.008) * 15;
            ctx.lineTo(x, groundY - hillHeight);
        }
        ctx.lineTo(this.width, groundY);
        ctx.closePath();
        ctx.fill();

        // === GROUND ===
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, this.height);
        if (isForest) {
            groundGradient.addColorStop(0, '#a8b89a');
            groundGradient.addColorStop(0.15, '#b5a078');
            groundGradient.addColorStop(0.5, '#a89068');
            groundGradient.addColorStop(1, '#8f7a52');
        } else {
            groundGradient.addColorStop(0, '#8BC34A');
            groundGradient.addColorStop(0.1, '#7CB342');
            groundGradient.addColorStop(0.4, '#689F38');
            groundGradient.addColorStop(1, '#558B2F');
        }
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, this.width, this.height - groundY);

        // === DIRT PATCHES ===
        ctx.fillStyle = isForest ? 'rgba(139, 115, 85, 0.2)' : 'rgba(139, 90, 43, 0.15)';
        for (let i = 0; i < 8; i++) {
            const patchX = (i * 250 + this.survivalTime * 5) % (this.width + 100) - 50;
            ctx.beginPath();
            ctx.ellipse(patchX, groundY + 80, 60, 25, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // === GRASS BLADES ===
        this.grassBlades.forEach(blade => {
            const x = ((blade.x) % (this.width + 50)) - 25;
            const sway = Math.sin(this.survivalTime * 2 + blade.sway) * 3;

            ctx.fillStyle = isForest ? '#8fa87a' : '#7CB342';
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.quadraticCurveTo(x + sway, groundY - blade.height / 2, x + sway + 2, groundY - blade.height);
            ctx.quadraticCurveTo(x + sway + blade.width / 2, groundY - blade.height / 2, x + blade.width, groundY);
            ctx.fill();
        });

        // === PLATFORM EDGE ===
        ctx.strokeStyle = isForest ? '#6b5344' : '#2d2d2d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(this.width, groundY);
        ctx.stroke();

        // === SIDE TREES (forest only, drawn on top of hill/ground) ===
        if (isForest) {
            this.drawSideTrees(ctx, groundY);
        }

        // === FLOWERS (forest: softer / fewer) ===
        ctx.textAlign = 'center';
        this.flowers.forEach(flower => {
            const x = ((flower.x + this.survivalTime * 12) % (this.width + 100)) - 50;
            ctx.font = `${flower.size}px serif`;
            ctx.fillText(flower.type, x, groundY + flower.yOffset);
        });

        // Draw entities
        this.entities.forEach(e => e.draw(ctx));
    }

    drawCloud(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.35, y - size * 0.15, size * 0.4, 0, Math.PI * 2);
        ctx.arc(x + size * 0.7, y, size * 0.45, 0, Math.PI * 2);
        ctx.arc(x + size * 0.35, y + size * 0.15, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSideTrees(ctx, groundY) {
        const trees = [
            { x: 0.08, scale: 1.1 },
            { x: 0.92, scale: 0.95 },
            { x: 0.04, scale: 0.7 },
            { x: 0.96, scale: 0.8 }
        ];
        const w = this.width;
        const h = this.height;
        trees.forEach(({ x: xRatio, scale: s }) => {
            const x = w * xRatio;
            const trunkW = 18 * s;
            const trunkH = 140 * s;
            const foliageY = groundY - trunkH + 20 * s;
            const foliageR = 55 * s;
            ctx.fillStyle = '#5d4e37';
            ctx.fillRect(x - trunkW / 2, groundY - trunkH, trunkW, trunkH);
            ctx.fillStyle = '#2d5a27';
            ctx.beginPath();
            ctx.arc(x, foliageY, foliageR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x - foliageR * 0.6, foliageY + foliageR * 0.3, foliageR * 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + foliageR * 0.5, foliageY + foliageR * 0.2, foliageR * 0.75, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3d6b35';
            ctx.beginPath();
            ctx.arc(x - foliageR * 0.3, foliageY - foliageR * 0.2, foliageR * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2d5a27';
            ctx.beginPath();
            const tx = x + foliageR * 0.25;
            const ty = foliageY - foliageR * 0.05;
            ctx.moveTo(tx, ty - 12 * s);
            ctx.lineTo(tx + 14 * s, ty + 10 * s);
            ctx.lineTo(tx - 8 * s, ty + 8 * s);
            ctx.closePath();
            ctx.fill();
        });
    }
}
