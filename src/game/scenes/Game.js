import Phaser from "phaser";
import EasyStar from "easystarjs";
import { Tower } from "../../components/Tower/Tower";

export class Game extends Phaser.Scene {
    constructor() {
        super({ key: "Game" });
        this.easyStar = new EasyStar.js();
    }

    create() {
        // Game config
        this.gridSize = 64;
        this.gridWidth = 16; // 1024 / 64
        this.gridHeight = 11; // 704 / 64 (leaves bottom row for UI)

        // Game state
        this.health = 20;
        this.money = 500;
        this.wave = 1;
        this.waveActive = false;
        this.waveEnemiesTotal = 0;
        this.waveEnemiesDefeated = 0;

        // Game objects
        this.towers = [];
        this.enemies = [];
        this.bullets = [];

        // Grass health grid
        this.grassHealth = [];
        this.grassTiles = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.grassHealth[y] = [];
            this.grassTiles[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.grassHealth[y][x] = 20; // Each tile starts with 20 health
            }
        }

        // Setup grid for pathfinding
        this.setupPathfinding();

        // Draw UI
        this.drawGrid();
        this.createUI();

        // Demo towers
        this.placeDemoTowers();

        // Input handling
        this.input.on("pointerdown", (pointer) => this.onPointerDown(pointer));

        // Start first wave after a short delay
        this.time.delayedCall(2000, () => this.startWave());

        // Game loop
        this.enemyPathUpdateTimer = this.time.addEvent({
            delay: 500,
            callback: () => this.updateEnemyPaths(),
            loop: true,
        });

        // Check for enemies damaging target every second
        this.targetDamageTimer = this.time.addEvent({
            delay: 1000,
            callback: () => this.checkEnemiesOnClosestTiles(),
            loop: true,
        });
    }

    setupPathfinding() {
        // Create a walkable grid
        const grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            const row = [];
            for (let x = 0; x < this.gridWidth; x++) {
                row.push(0); // 0 = walkable
            }
            grid.push(row);
        }

        this.pathfindingGrid = grid;
        this.easyStar.setGrid(grid);
        this.easyStar.setAcceptableTiles([0]);
    }

    drawGrid() {
        // Draw individual grass tiles
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const tile = this.add.graphics();
                this.grassTiles[y][x] = tile;
                this.drawGrassTile(x, y);
            }
        }

        // Draw grid lines on top
        const gridLines = this.add.graphics();
        gridLines.lineStyle(1, 0x2d5a2d, 0.3); // Darker green grid lines

        for (let x = 0; x <= this.gridWidth; x++) {
            gridLines.lineBetween(
                x * this.gridSize,
                0,
                x * this.gridSize,
                this.gridHeight * this.gridSize,
            );
        }

        for (let y = 0; y <= this.gridHeight; y++) {
            gridLines.lineBetween(
                0,
                y * this.gridSize,
                this.gridWidth * this.gridSize,
                y * this.gridSize,
            );
        }
    }

    drawGrassTile(x, y) {
        const tile = this.grassTiles[y][x];
        const health = this.grassHealth[y][x];
        const cellX = x * this.gridSize;
        const cellY = y * this.gridSize;

        tile.clear();

        // Calculate base color based on health
        let baseColor, accentColor;
        if (health > 15) {
            baseColor = 0x3d7a2f; // Deep grass green
            accentColor = 0x2d5a1f;
        } else if (health > 10) {
            baseColor = 0x5d8a3f; // Healthy green
            accentColor = 0x3d6a1f;
        } else if (health > 5) {
            baseColor = 0x8a8a3f; // Dry green-brown
            accentColor = 0x6a6a1f;
        } else {
            baseColor = 0x7a5a2f; // Dead brown
            accentColor = 0x5a3a0f;
        }

        // Draw base
        tile.fillStyle(baseColor, 1);
        tile.fillRect(cellX, cellY, this.gridSize, this.gridSize);

        // Add edge shadow for depth
        tile.lineStyle(1, accentColor, 0.3);
        tile.strokeRect(cellX, cellY, this.gridSize, this.gridSize);

        // Add minimal texture details
        if (health > 0) {
            // Just a few accent spots for texture
            tile.fillStyle(accentColor, 0.25);
            for (let i = 0; i < 5; i++) {
                const offsetX = Math.random() * this.gridSize;
                const offsetY = Math.random() * this.gridSize;
                tile.fillCircle(
                    cellX + offsetX,
                    cellY + offsetY,
                    2 + Math.random() * 2,
                );
            }
        }
    }

    updateGrassTileColor(x, y) {
        const tile = this.grassTiles[y][x];
        const health = this.grassHealth[y][x];
        const cellX = x * this.gridSize;
        const cellY = y * this.gridSize;

        tile.clear();

        // Calculate base color based on health
        let baseColor, accentColor;
        if (health > 15) {
            baseColor = 0x3d7a2f; // Deep grass green
            accentColor = 0x2d5a1f;
        } else if (health > 10) {
            baseColor = 0x5d8a3f; // Healthy green
            accentColor = 0x3d6a1f;
        } else if (health > 5) {
            baseColor = 0x8a8a3f; // Dry green-brown
            accentColor = 0x6a6a1f;
        } else {
            baseColor = 0x7a5a2f; // Dead brown
            accentColor = 0x5a3a0f;
        }

        // Draw base
        tile.fillStyle(baseColor, 1);
        tile.fillRect(cellX, cellY, this.gridSize, this.gridSize);

        // Add edge shadow
        tile.lineStyle(1, accentColor, 0.3);
        tile.strokeRect(cellX, cellY, this.gridSize, this.gridSize);

        // Add minimal texture
        if (health > 0) {
            tile.fillStyle(accentColor, 0.25);
            for (let i = 0; i < 3; i++) {
                const offsetX = Math.random() * this.gridSize;
                const offsetY = Math.random() * this.gridSize;
                tile.fillCircle(
                    cellX + offsetX,
                    cellY + offsetY,
                    1 + Math.random() * 1.5,
                );
            }
        }
    }

    createUI() {
        // Create medieval UI background bar at bottom (always visible)
        const menuY = this.gridHeight * this.gridSize + 5;
        const uiBg = this.add.graphics();
        uiBg.fillStyle(0x5d4e37, 1); // Medieval brown
        uiBg.fillRect(0, menuY - 5, 1024, 64);

        // Add stone texture pattern (lines)
        uiBg.lineStyle(1, 0x4a3a27, 0.6);
        for (let i = 0; i < 10; i++) {
            uiBg.lineBetween(0, menuY - 5 + i * 7, 1024, menuY - 5 + i * 7);
        }

        // Decorative borders
        uiBg.lineStyle(3, 0x8b7355, 1);
        uiBg.lineBetween(0, menuY - 5, 1024, menuY - 5);
        uiBg.lineBetween(0, menuY + 59, 1024, menuY + 59);

        uiBg.setScrollFactor(0);
        uiBg.setDepth(-1); // Behind other UI elements

        this.healthText = this.add.text(10, 10, `Health: ${this.health}`, {
            fontSize: "18px",
            fill: "#ffffff",
        });
        this.moneyText = this.add.text(10, 35, `Money: ${this.money}`, {
            fontSize: "18px",
            fill: "#ffff00",
        });
        this.waveText = this.add.text(10, 60, `Wave: ${this.wave}`, {
            fontSize: "18px",
            fill: "#00ff00",
        });
        this.infoText = this.add.text(10, 85, "Click to place towers ($100)", {
            fontSize: "14px",
            fill: "#aaaaaa",
        });

        // Tower upgrade UI at bottom
        this.upgradeMenuContainer = null;
        this.selectedTower = null;

        // Draw target castle at bottom-right
        const castleX =
            (this.gridWidth - 1) * this.gridSize + this.gridSize / 2;
        const castleY =
            (this.gridHeight - 1) * this.gridSize + this.gridSize / 2;

        this.targetZone = this.add.graphics();
        this.targetZone.x = castleX;
        this.targetZone.y = castleY;
        this.drawCastle(this.targetZone, 0x888888); // Gray castle
    }

    showTowerUpgradeMenu(tower) {
        // Remove old menu if exists
        if (this.upgradeMenuContainer) {
            this.upgradeMenuContainer.forEach((element) => element.destroy());
        }
        this.upgradeMenuContainer = [];

        const menuY = this.gridHeight * this.gridSize + 5;
        const menuX = 10;

        // Title with medieval styling (background is now persistent in createUI)
        const titleText = this.add.text(
            menuX + 5,
            menuY + 2,
            "⚔ Tower Upgrades ⚔",
            {
                fontSize: "14px",
                fill: "#ffd700",
                fontStyle: "bold",
                fontFamily: "Georgia, serif",
            },
        );
        titleText.setScrollFactor(0);
        this.upgradeMenuContainer.push(titleText);

        // Range upgrade with icon
        this.createUpgradeIcon(
            tower,
            "range",
            menuX + 120,
            menuY + 10,
            "Range",
        );

        // Strength upgrade with icon
        this.createUpgradeIcon(
            tower,
            "strength",
            menuX + 220,
            menuY + 10,
            "Strength",
        );

        // Accuracy upgrade with icon
        this.createUpgradeIcon(
            tower,
            "accuracy",
            menuX + 320,
            menuY + 10,
            "Accuracy",
        );

        // Fire rate upgrade with icon
        this.createUpgradeIcon(
            tower,
            "fireRate",
            menuX + 420,
            menuY + 10,
            "Speed",
        );
    }

    createUpgradeIcon(tower, upgradeType, x, y, label) {
        const size = 45;
        const cost = tower.upgradeCosts[upgradeType];
        const level = tower.upgrades[upgradeType];

        // Medieval stone background with texture
        const bg = this.add.graphics();
        bg.fillStyle(0x6b5345, 1); // Dark stone
        bg.fillRect(x, y, size, size);

        // Add highlight on top-left for 3D effect
        bg.lineStyle(2, 0x8b7355, 1);
        bg.lineBetween(x, y, x + size, y);

        // Dark shadow on bottom-right
        bg.lineStyle(2, 0x4a3a27, 1);
        bg.lineBetween(x, y + size, x + size, y + size);
        bg.lineBetween(x + size, y, x + size, y + size);

        // Border
        bg.lineStyle(2, 0xdaa520, 1);
        bg.strokeRect(x + 1, y + 1, size - 2, size - 2);

        bg.setScrollFactor(0);
        this.upgradeMenuContainer.push(bg);

        // Icon graphics
        const icon = this.add.graphics();
        icon.setScrollFactor(0);

        if (upgradeType === "range") {
            // Range icon: medieval crossbow/bow
            icon.fillStyle(0xccaa00, 1);
            icon.fillRect(x + size / 2 - 2, y + 8, 4, 20);
            icon.lineStyle(2, 0xccaa00, 1);
            icon.arc(x + size / 2, y + 8, 12, Math.PI, 2 * Math.PI);
            icon.stroke();
        } else if (upgradeType === "strength") {
            // Strength icon: sword
            icon.fillStyle(0xff8844, 1);
            icon.fillRect(x + size / 2 - 2, y + 5, 4, 25);
            icon.fillStyle(0xaa5533, 1);
            icon.fillRect(x + size / 2 - 8, y + 26, 16, 6);
            icon.fillStyle(0xffdd00, 1);
            icon.fillRect(x + size / 2 - 3, y + 28, 6, 3);
        } else if (upgradeType === "accuracy") {
            // Accuracy icon: target with arrows
            icon.lineStyle(2, 0x44ff44, 1);
            icon.strokeCircle(x + size / 2, y + size / 2, 14);
            icon.strokeCircle(x + size / 2, y + size / 2, 8);
            icon.fillStyle(0x44ff44, 1);
            icon.fillCircle(x + size / 2, y + size / 2, 3);
            // Crosshair lines
            icon.lineBetween(x + 3, y + size / 2, x + size - 3, y + size / 2);
            icon.lineBetween(x + size / 2, y + 3, x + size / 2, y + size - 3);
        } else if (upgradeType === "fireRate") {
            // Fire rate icon: flaming torch/fire
            icon.fillStyle(0xff6600, 1);
            icon.fillRect(x + size / 2 - 3, y + 18, 6, 18);
            icon.fillStyle(0xff0000, 1);
            icon.fillCircle(x + size / 2, y + 8, 6);
            icon.fillStyle(0xffaa00, 1);
            icon.fillCircle(x + size / 2 - 3, y + 5, 4);
            icon.fillCircle(x + size / 2 + 3, y + 7, 4);
        }
        this.upgradeMenuContainer.push(icon);

        // Label text below icon
        const labelText = this.add.text(x + size / 2, y + size + 18, label, {
            fontSize: "10px",
            fill: "#ffd700",
            fontStyle: "bold",
            align: "center",
            fontFamily: "Georgia, serif",
        });
        labelText.setOrigin(0.5, 0);
        labelText.setScrollFactor(0);
        this.upgradeMenuContainer.push(labelText);

        // Level text in corner
        const levelText = this.add.text(
            x + size - 10,
            y + size - 12,
            `Lv${level}`,
            {
                fontSize: "10px",
                fill: "#ffff00",
                fontStyle: "bold",
                fontFamily: "Georgia, serif",
            },
        );
        levelText.setScrollFactor(0);
        this.upgradeMenuContainer.push(levelText);

        // Cost text
        const costText = this.add.text(x + size / 2, y + size + 5, `$${cost}`, {
            fontSize: "11px",
            fill: "#ffdd00",
            align: "center",
            fontStyle: "bold",
            fontFamily: "Georgia, serif",
        });
        costText.setOrigin(0.5, 0);
        costText.setScrollFactor(0);
        this.upgradeMenuContainer.push(costText);

        // Make clickable
        const button = this.add.zone(x + size / 2, y + size / 2, size, size);
        button.setScrollFactor(0);
        button.setInteractive();
        button.on("pointerdown", () => this.upgradeTower(tower, upgradeType));
        this.upgradeMenuContainer.push(button);
    }

    upgradeTower(tower, upgradeType) {
        const cost = tower.upgradeCosts[upgradeType];

        if (this.money >= cost) {
            tower.upgrade(upgradeType);
            this.money -= cost;
            this.updateUI();
            this.showTowerUpgradeMenu(tower);
        } else {
            this.infoText.setText("Not enough money for upgrade!");
            this.time.delayedCall(2000, () => {
                this.infoText.setText("Click to place towers ($100)");
            });
        }
    }

    hideTowerUpgradeMenu() {
        if (this.upgradeMenuContainer) {
            this.upgradeMenuContainer.forEach((element) => element.destroy());
            this.upgradeMenuContainer = null;
        }
        this.selectedTower = null;
    }

    drawCastle(graphics, baseColor = 0x888888) {
        graphics.clear();

        // Main castle walls
        graphics.fillStyle(baseColor, 1);
        graphics.fillRect(-28, -10, 56, 30);

        // Stone texture
        graphics.lineStyle(1, baseColor - 0x222222, 0.5);
        for (let i = 0; i < 3; i++) {
            graphics.lineBetween(-28, -5 + i * 10, 28, -5 + i * 10);
        }

        // Left tower
        graphics.fillStyle(baseColor, 1);
        graphics.fillRect(-32, -15, 12, 35);

        // Right tower
        graphics.fillRect(20, -15, 12, 35);

        // Crenellations on main wall
        graphics.fillStyle(baseColor, 1);
        for (let i = 0; i < 7; i++) {
            if (i % 2 === 0) {
                graphics.fillRect(-24 + i * 8, -18, 6, 8);
            }
        }

        // Crenellations on left tower
        for (let i = 0; i < 2; i++) {
            if (i % 2 === 0) {
                graphics.fillRect(-30 + i * 6, -23, 5, 8);
            }
        }

        // Crenellations on right tower
        for (let i = 0; i < 2; i++) {
            if (i % 2 === 0) {
                graphics.fillRect(22 + i * 6, -23, 5, 8);
            }
        }

        // Gate/door
        graphics.fillStyle(0x654321, 1);
        graphics.fillRect(-8, 5, 16, 15);

        // Gate arch
        graphics.fillStyle(0x654321, 1);
        graphics.beginPath();
        graphics.arc(0, 5, 8, Math.PI, 0, true);
        graphics.fillPath();

        // Windows on towers
        graphics.fillStyle(0x444444, 1);
        graphics.fillRect(-28, -5, 4, 6);
        graphics.fillRect(24, -5, 4, 6);
    }

    drawEnemy(graphics, walkPhase = 0, color = 0xff4444) {
        graphics.clear();

        // Body
        graphics.fillStyle(color, 1);
        graphics.fillRect(-3, -6, 6, 8);

        // Head
        graphics.fillStyle(0xffdbac, 1);
        graphics.fillCircle(0, -10, 3);

        // Legs with walking animation
        graphics.fillStyle(0x654321, 1);
        const legOffset = Math.sin(walkPhase) * 3;

        // Left leg
        graphics.fillRect(-2.5, 2, 2, 4 + legOffset);
        // Right leg
        graphics.fillRect(0.5, 2, 2, 4 - legOffset);

        // Arms
        graphics.fillStyle(color, 1);
        const armSwing = Math.sin(walkPhase) * 2;
        graphics.fillRect(-4, -4 + armSwing, 1.5, 4);
        graphics.fillRect(2.5, -4 - armSwing, 1.5, 4);

        // Sword in right hand
        graphics.lineStyle(2, 0xcccccc, 1); // Silver blade
        graphics.lineBetween(3.5, -2 - armSwing, 3.5, -10 - armSwing);

        // Sword hilt (crossguard)
        graphics.lineStyle(1.5, 0x8b4513, 1); // Brown hilt
        graphics.lineBetween(2, -2 - armSwing, 5, -2 - armSwing);

        // Sword pommel
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillCircle(3.5, -1 - armSwing, 1);
    }

    updateUI() {
        this.healthText.setText(`Health: ${this.health}`);
        this.moneyText.setText(`Money: ${this.money}`);
        this.waveText.setText(`Wave: ${this.wave}`);
    }

    placeDemoTowers() {
        this.addTower(2, 2);
        this.addTower(7, 2);
        this.money -= 200;
        this.updateUI();
    }

    canPlaceTower(gridX, gridY) {
        // Don't allow blocking tiles that are critical paths
        // For simplicity, prevent blocking the last column or row approaching target
        const targetX = this.gridWidth - 1;
        const targetY = this.gridHeight - 1;

        // Don't block the target tile or the tiles that lead directly to it
        if (gridX === targetX || gridY === targetY) {
            // Allow blocking if there's an alternative route
            // For now, just check if this is one of the critical last tiles
            if (
                (gridX === targetX - 1 && gridY === targetY) ||
                (gridX === targetX && gridY === targetY - 1)
            ) {
                // These are the primary last tiles, don't block them
                return false;
            }
        }

        return true;
    }

    onPointerDown(pointer) {
        const gridX = Math.floor(pointer.worldX / this.gridSize);
        const gridY = Math.floor(pointer.worldY / this.gridSize);

        // Check bounds
        if (
            gridX >= 0 &&
            gridX < this.gridWidth &&
            gridY >= 0 &&
            gridY < this.gridHeight
        ) {
            // Check if there's already a tower there
            const hasTower = this.towers.some(
                (tower) =>
                    Math.floor(tower.x / this.gridSize) === gridX &&
                    Math.floor(tower.y / this.gridSize) === gridY,
            );

            if (!hasTower && this.money >= 100) {
                // Check if this placement would block all paths
                if (!this.canPlaceTower(gridX, gridY)) {
                    this.infoText.setText(
                        "Cannot block the path! Enemies need a route.",
                    );
                    this.time.delayedCall(2000, () => {
                        this.infoText.setText("Click to place towers ($100)");
                    });
                    return;
                }

                this.addTower(gridX, gridY);
                this.money -= 100;
                this.updateUI();
            }
        }
    }

    addTower(gridX, gridY) {
        const tower = new Tower(this, 0, 0, this.gridSize);
        tower.place(gridX, gridY, this.gridSize);
        this.towers.push(tower);

        // Mark grid as blocked for pathfinding
        this.pathfindingGrid[gridY][gridX] = 1;
        this.easyStar.setGrid(this.pathfindingGrid);

        // Recalculate paths only for moving enemies that haven't reached target
        for (let enemy of this.enemies) {
            if (
                enemy.active &&
                !enemy.hasDamagedTarget &&
                enemy.gridPath.length > 0
            ) {
                const currentGridX = Math.floor(enemy.x / this.gridSize);
                const currentGridY = Math.floor(enemy.y / this.gridSize);
                this.requestPath(
                    currentGridX,
                    currentGridY,
                    this.gridWidth - 2,
                    this.gridHeight - 1,
                    enemy,
                );
            }
        }

        return tower;
    }

    startWave() {
        this.waveActive = true;
        this.waveEnemiesTotal = 5 + this.wave * 2; // 7 enemies wave 1, 9 wave 2, etc.
        this.waveEnemiesDefeated = 0;

        this.infoText.setText(
            `Wave ${this.wave} starting! ${this.waveEnemiesTotal} enemies`,
        );

        // Spawn all enemies with delays
        for (let i = 0; i < this.waveEnemiesTotal; i++) {
            this.time.delayedCall(i * 1000, () => this.spawnEnemy());
        }
    }

    spawnEnemy() {
        // Spawn at top-left
        const enemy = this.add.graphics();
        enemy.x = this.gridSize / 2;
        enemy.y = this.gridSize / 2;
        enemy.walkPhase = 0;
        enemy.baseColor = 0xff4444;
        enemy.active = true; // Mark as active
        this.drawEnemy(enemy, 0, enemy.baseColor);

        // Health scales with wave: base damage * shots needed * wave multiplier
        const baseDamage = 25; // Tower base damage
        const shotsToKill = 3; // Base shots needed to kill
        const waveMultiplier = 1 + (this.wave - 1) * 0.5; // +50% health per wave
        enemy.health = baseDamage * shotsToKill * waveMultiplier;
        enemy.maxHealth = enemy.health; // Store max health for reward calculation
        enemy.shotsToKill = shotsToKill * waveMultiplier; // Store expected shots for reward
        enemy.waveNumber = this.wave; // Store wave for reward calculation
        enemy.speed = 60;
        enemy.gridPath = [];
        enemy.pathIndex = 0;
        enemy.isMoving = false;

        this.enemies.push(enemy);

        // Request path to one tile before target (adjacent to target)
        this.requestPath(0, 0, this.gridWidth - 2, this.gridHeight - 1, enemy);
    }

    requestPath(fromX, fromY, toX, toY, enemy) {
        if (!enemy) return;

        this.easyStar.findPath(fromX, fromY, toX, toY, (path) => {
            if (path && path.length > 0 && enemy.active) {
                enemy.gridPath = path;
                enemy.pathIndex = 0;
                enemy.isMoving = true;
                this.moveEnemyAlongPath(enemy);
            }
        });
        this.easyStar.calculate();
    }

    getClosestTilesToTarget() {
        const targetX = this.gridWidth - 1;
        const targetY = this.gridHeight - 1;

        // Return all 8 adjacent tiles (left, right, top, bottom, and 4 diagonals)
        return [
            { x: targetX - 1, y: targetY }, // Left
            { x: targetX + 1, y: targetY }, // Right (off-grid, but included)
            { x: targetX, y: targetY - 1 }, // Top
            { x: targetX, y: targetY + 1 }, // Bottom (off-grid, but included)
            { x: targetX - 1, y: targetY - 1 }, // Top-left diagonal
            { x: targetX + 1, y: targetY - 1 }, // Top-right diagonal (off-grid)
            { x: targetX - 1, y: targetY + 1 }, // Bottom-left diagonal (off-grid)
            { x: targetX + 1, y: targetY + 1 }, // Bottom-right diagonal (off-grid)
        ];
    }

    checkEnemiesOnClosestTiles() {
        if (this.health <= 0 || !this.targetZone || !this.targetZone.active)
            return;

        const closestTiles = this.getClosestTilesToTarget();
        let enemiesAttacking = 0;

        for (let enemy of this.enemies) {
            if (!enemy || !enemy.active) continue;

            const enemyGridX = Math.floor(enemy.x / this.gridSize);
            const enemyGridY = Math.floor(enemy.y / this.gridSize);

            // Check if enemy is on any closest tile
            const isOnClosestTile = closestTiles.some(
                (tile) => tile.x === enemyGridX && tile.y === enemyGridY,
            );

            if (isOnClosestTile) {
                enemiesAttacking++;
                // Track enemy reaching target for wave completion
                if (!enemy.reachedTarget) {
                    enemy.reachedTarget = true;
                    this.waveEnemiesDefeated++;
                }
            }
        }

        // Apply damage if any enemies are on closest tiles
        if (enemiesAttacking > 0) {
            this.health -= enemiesAttacking;

            // Visual feedback - flash castle red
            this.drawCastle(this.targetZone, 0xff0000);
            this.time.delayedCall(200, () => {
                if (this.targetZone && this.targetZone.active) {
                    this.drawCastle(this.targetZone, 0x888888);
                }
            });

            this.updateUI();
            this.checkWaveComplete();

            if (this.health <= 0) {
                this.targetZone.destroy();
                this.time.delayedCall(1000, () => this.scene.restart());
            }
        }
    }

    updateEnemyPaths() {
        for (let enemy of this.enemies) {
            if (
                enemy.active &&
                !enemy.isMoving &&
                !enemy.reachedTarget &&
                enemy.gridPath.length > 0
            ) {
                this.moveEnemyAlongPath(enemy);
            }
        }
    }

    moveEnemyAlongPath(enemy) {
        if (!enemy || !enemy.active) {
            return;
        }

        if (!enemy.gridPath || enemy.pathIndex >= enemy.gridPath.length) {
            // Reached end of path - stop moving, damage handled by timer
            enemy.isMoving = false;
            return;
        }

        const nextNode = enemy.gridPath[enemy.pathIndex];
        const targetX = nextNode.x * this.gridSize + this.gridSize / 2;
        const targetY = nextNode.y * this.gridSize + this.gridSize / 2;

        // Calculate actual distance for consistent speed
        const distance = Phaser.Math.Distance.Between(
            enemy.x,
            enemy.y,
            targetX,
            targetY,
        );

        enemy.isMoving = true;

        // Degrade grass on target tile
        const gridX = nextNode.x;
        const gridY = nextNode.y;
        if (this.grassHealth[gridY] && this.grassHealth[gridY][gridX] > 0) {
            this.grassHealth[gridY][gridX]--;
            this.updateGrassTileColor(gridX, gridY);
        }

        this.tweens.add({
            targets: enemy,
            x: targetX,
            y: targetY,
            duration: (distance / enemy.speed) * 1000,
            ease: "Linear",
            onUpdate: () => {
                // Animate walking
                enemy.walkPhase += 0.15;
                this.drawEnemy(enemy, enemy.walkPhase, enemy.baseColor);
            },
            onComplete: () => {
                enemy.pathIndex++;
                enemy.isMoving = false;
                this.moveEnemyAlongPath(enemy);
            },
        });
    }

    addBullet(x, y, angle, damage) {
        // Create arrow as graphics object
        const arrow = this.add.graphics();
        arrow.x = x;
        arrow.y = y;
        arrow.angle = (angle * 180) / Math.PI; // Convert to degrees for rotation

        // Draw arrow shaft (brown wooden stick)
        arrow.fillStyle(0x8b4513, 1);
        arrow.fillRect(-12, -1.5, 12, 3);

        // Draw arrowhead (gray metal triangle)
        arrow.fillStyle(0x888888, 1);
        arrow.fillTriangle(
            0,
            0, // Tip
            -8,
            -4, // Bottom left
            -8,
            4, // Bottom right
        );

        // Draw fletching (feathers at back)
        arrow.fillStyle(0xdddddd, 1);
        arrow.fillTriangle(-12, 0, -14, -3, -14, 3);

        const bullet = arrow; // Keep same variable name for compatibility
        bullet.damage = damage;
        bullet.velocity = {
            x: Math.cos(angle) * 300,
            y: Math.sin(angle) * 300,
        };

        this.bullets.push(bullet);

        // Check collision with enemies each frame
        const checkCollision = () => {
            if (!bullet || !bullet.active) {
                this.events.off("update", checkCollision);
                return;
            }

            for (let enemy of this.enemies) {
                if (!enemy || !enemy.active) continue;

                const distance = Phaser.Math.Distance.Between(
                    bullet.x,
                    bullet.y,
                    enemy.x,
                    enemy.y,
                );

                if (distance < 15) {
                    this.events.off("update", checkCollision);
                    this.hitEnemy(bullet, enemy, damage);
                    return;
                }
            }
        };

        this.events.on("update", checkCollision);

        // Movement
        this.tweens.add({
            targets: bullet,
            x: x + Math.cos(angle) * 500,
            y: y + Math.sin(angle) * 500,
            duration: 2000,
            onComplete: () => {
                this.events.off("update", checkCollision);
                if (bullet && bullet.active) {
                    bullet.destroy();
                }
                this.bullets = this.bullets.filter((b) => b && b.active);
            },
        });
    }

    hitEnemy(bullet, enemy, damage) {
        if (!enemy || !enemy.active) return;

        enemy.health -= damage;
        this.drawEnemy(enemy, enemy.walkPhase, 0xff8888);

        this.time.delayedCall(100, () => {
            if (enemy && enemy.active)
                this.drawEnemy(enemy, enemy.walkPhase, enemy.baseColor);
        });

        if (bullet && bullet.active) {
            bullet.destroy();
            this.bullets = this.bullets.filter((b) => b && b.active);
        }

        if (enemy.health <= 0) {
            enemy.destroy();
            this.enemies = this.enemies.filter((e) => e && e.active);

            // Money reward scales with enemy difficulty
            // Base: 15 gold per enemy
            // + 5 gold per shot needed to kill (difficulty)
            // + wave bonus
            const baseReward = 15;
            const difficultyBonus = Math.floor(enemy.shotsToKill * 5);
            const waveBonus = (enemy.waveNumber - 1) * 3;
            const moneyReward = baseReward + difficultyBonus + waveBonus;

            this.money += moneyReward;
            this.waveEnemiesDefeated++;
            this.updateUI();
            this.checkWaveComplete();
        }
    }

    checkWaveComplete() {
        if (
            this.waveActive &&
            this.waveEnemiesDefeated >= this.waveEnemiesTotal
        ) {
            this.waveActive = false;
            this.wave++;
            this.updateUI();

            this.infoText.setText(
                `Wave ${this.wave - 1} complete! Next wave in 10 seconds...`,
            );

            // Start next wave after 10 seconds
            this.time.delayedCall(10000, () => this.startWave());
        }
    }

    update() {
        // Update all towers
        for (let tower of this.towers) {
            if (tower && tower.active) {
                tower.update();
            }
        }
    }
}

