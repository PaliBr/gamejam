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
        // Create modern futuristic UI background bar at bottom
        const menuY = this.gridHeight * this.gridSize + 5;
        const uiBg = this.add.graphics();

        // Medieval parchment background (aged leather/wood look)
        uiBg.fillStyle(0x3a3028, 1); // Dark aged leather
        uiBg.fillRect(0, menuY - 5, 1024, 64);

        // Stone/wood top border
        uiBg.lineStyle(3, 0x5a4a38, 1); // Dark wood
        uiBg.lineBetween(0, menuY - 5, 1024, menuY - 5);
        uiBg.lineStyle(2, 0x7a6a58, 0.8); // Lighter wood accent
        uiBg.lineBetween(0, menuY - 3, 1024, menuY - 3);

        // Bottom ornate border
        uiBg.lineStyle(3, 0x5a4a38, 1); // Dark wood
        uiBg.lineBetween(0, menuY + 59, 1024, menuY + 59);
        uiBg.lineStyle(2, 0x7a6a58, 0.8); // Lighter wood accent
        uiBg.lineBetween(0, menuY + 57, 1024, menuY + 57);

        // Medieval decorative corner elements (stone blocks)
        uiBg.fillStyle(0x4a3a28, 0.6);
        uiBg.fillRect(0, menuY - 5, 8, 64);
        uiBg.fillRect(1016, menuY - 5, 8, 64);

        uiBg.setScrollFactor(0);
        uiBg.setDepth(-1);

        // Medieval stat displays with aged parchment style
        this.healthText = this.add.text(20, 12, `HEALTH: ${this.health}`, {
            fontSize: "18px",
            fill: "#c41e3a",
            fontFamily: "serif",
            fontStyle: "bold",
            stroke: "#1a1410",
            strokeThickness: 2,
        });
        this.healthText.setScrollFactor(0);

        this.moneyText = this.add.text(20, 32, `GOLD: ${this.money}`, {
            fontSize: "18px",
            fill: "#d4af37",
            fontFamily: "serif",
            fontStyle: "bold",
            stroke: "#1a1410",
            strokeThickness: 2,
        });
        this.moneyText.setScrollFactor(0);

        this.waveText = this.add.text(20, 52, `WAVE: ${this.wave}`, {
            fontSize: "18px",
            fill: "#8b7355",
            fontFamily: "serif",
            fontStyle: "bold",
            stroke: "#1a1410",
            strokeThickness: 2,
        });
        this.waveText.setScrollFactor(0);

        this.infoText = this.add.text(
            300,
            25,
            "Click to place towers (100 Gold)",
            {
                fontSize: "11px",
                fill: "#b8956a",
                fontFamily: "serif",
                stroke: "#1a1410",
                strokeThickness: 1,
            },
        );
        this.infoText.setScrollFactor(0);

        // Tower upgrade UI at bottom
        this.upgradeMenuContainer = null;
        this.selectedTower = null;

        // Draw target castle at bottom-right
        const castleX =
            (this.gridWidth - 1) * this.gridSize + this.gridSize / 2;
        const castleY =
            (this.gridHeight - 2) * this.gridSize + this.gridSize / 2;

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

        const menuY = this.gridHeight * this.gridSize + 5 - 209;
        const menuX = 10;
        const menuWidth = 430;
        const menuHeight = 209;

        // Medieval wooden panel background
        const menuBg = this.add.graphics();
        menuBg.fillStyle(0x5a4a38, 1); // Medium wood tone
        menuBg.fillRect(menuX, menuY, menuWidth, menuHeight);

        // Dark wood outer border (main frame)
        menuBg.lineStyle(4, 0x2a2018, 1); // Very dark wood
        menuBg.strokeRect(menuX, menuY, menuWidth, menuHeight);

        // Lighter wood inner accent
        menuBg.lineStyle(2, 0x8b7355, 1); // Lighter wood accent
        menuBg.strokeRect(menuX + 3, menuY + 3, menuWidth - 6, menuHeight - 6);

        // Corner decorations (stone blocks)
        menuBg.fillStyle(0x3a2a18, 0.8);
        menuBg.fillRect(menuX, menuY, 6, 6);
        menuBg.fillRect(menuX + menuWidth - 6, menuY, 6, 6);
        menuBg.fillRect(menuX, menuY + menuHeight - 6, 6, 6);
        menuBg.fillRect(menuX + menuWidth - 6, menuY + menuHeight - 6, 6, 6);

        menuBg.setScrollFactor(0);
        this.upgradeMenuContainer.push(menuBg);

        // Medieval parchment title with ornate styling
        const titleText = this.add.text(
            menuX + menuWidth / 2,
            menuY + 8,
            "~ Tower Enhancements ~",
            {
                fontSize: "12px",
                fill: "#d4af37",
                fontStyle: "bold",
                fontFamily: "serif",
                stroke: "#1a1410",
                strokeThickness: 2,
                align: "center",
            },
        );
        titleText.setOrigin(0.5, 0);
        titleText.setScrollFactor(0);
        this.upgradeMenuContainer.push(titleText);

        const iconStartX = menuX + 15;
        const iconStartY = menuY + 89;
        const iconSpacing = 99;

        // Range upgrade with icon
        this.createUpgradeIcon(tower, "range", iconStartX, iconStartY, "RANGE");

        // Strength upgrade with icon
        this.createUpgradeIcon(
            tower,
            "strength",
            iconStartX + iconSpacing,
            iconStartY,
            "POWER",
        );

        // Accuracy upgrade with icon
        this.createUpgradeIcon(
            tower,
            "accuracy",
            iconStartX + iconSpacing * 2,
            iconStartY,
            "PRECISION",
        );

        // Fire rate upgrade with icon
        this.createUpgradeIcon(
            tower,
            "fireRate",
            iconStartX + iconSpacing * 3,
            iconStartY,
            "FIREPOWER",
        );
    }

    createUpgradeIcon(tower, upgradeType, x, y, label) {
        const size = 75; // Increased from 55
        const cost = tower.upgradeCosts[upgradeType];
        const level = tower.upgrades[upgradeType];

        // Shadow effect for depth
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRect(x + 2, y + 2, size, size);
        shadow.setScrollFactor(0);
        this.upgradeMenuContainer.push(shadow);

        // Medieval stone/wood icon background with gradient effect
        const bg = this.add.graphics();
        bg.fillStyle(0x9d8b6e, 1); // Base leather/parchment color
        bg.fillRect(x, y, size, size);

        // Darker shading on left/top
        bg.fillStyle(0x7a6a52, 0.4);
        bg.fillRect(x, y, size / 2, size / 3);

        // Dark wood outer border (main frame)
        bg.lineStyle(4, 0x3a2a18, 1); // Very dark wood
        bg.strokeRect(x, y, size, size);

        // Lighter wood inner accent - double border for ornate look
        bg.lineStyle(2, 0xb8a88e, 1); // Light worn edge
        bg.strokeRect(x + 3, y + 3, size - 6, size - 6);

        bg.lineStyle(1, 0xa89878, 0.8);
        bg.strokeRect(x + 1, y + 1, size - 2, size - 2);

        // Corner ornaments
        bg.fillStyle(0xd4af37, 0.6);
        const cornerSize = 4;
        bg.fillRect(x + 2, y + 2, cornerSize, cornerSize);
        bg.fillRect(x + size - cornerSize - 2, y + 2, cornerSize, cornerSize);
        bg.fillRect(x + 2, y + size - cornerSize - 2, cornerSize, cornerSize);
        bg.fillRect(
            x + size - cornerSize - 2,
            y + size - cornerSize - 2,
            cornerSize,
            cornerSize,
        );

        bg.setScrollFactor(0);
        this.upgradeMenuContainer.push(bg);

        // Icon graphics with improved medieval style
        const icon = this.add.graphics();
        icon.setScrollFactor(0);

        if (upgradeType === "range") {
            // Range icon: archer arrow - improved
            icon.lineStyle(3, 0xd4af37, 1);
            icon.lineBetween(
                x + size / 2 - 12,
                y + size / 2,
                x + size / 2 + 12,
                y + size / 2,
            );
            icon.lineBetween(
                x + size / 2 + 12,
                y + size / 2,
                x + size / 2 + 8,
                y + size / 2 - 4,
            );
            icon.lineBetween(
                x + size / 2 + 12,
                y + size / 2,
                x + size / 2 + 8,
                y + size / 2 + 4,
            );
            icon.fillStyle(0xd4af37, 1);
            icon.fillCircle(x + size / 2 - 12, y + size / 2, 3);
            icon.fillCircle(x + size / 2, y + size / 2, 4);
        } else if (upgradeType === "strength") {
            // Strength icon: larger, more detailed sword
            icon.lineStyle(3, 0xc41e3a, 1);
            icon.lineBetween(x + size / 2, y + 10, x + size / 2, y + size - 12);
            icon.lineBetween(
                x + size / 2 - 8,
                y + 18,
                x + size / 2 + 8,
                y + 18,
            );
            icon.lineStyle(2, 0xc41e3a, 1);
            icon.lineBetween(
                x + size / 2 - 6,
                y + 20,
                x + size / 2 + 6,
                y + 20,
            );
            icon.fillStyle(0xc41e3a, 1);
            icon.fillCircle(x + size / 2, y + size - 8, 4);
        } else if (upgradeType === "accuracy") {
            // Accuracy icon: improved shield with target
            icon.lineStyle(3, 0x8b7355, 1);
            icon.strokeCircle(x + size / 2, y + size / 2, 16);
            icon.strokeCircle(x + size / 2, y + size / 2, 10);
            icon.strokeCircle(x + size / 2, y + size / 2, 4);
            icon.lineStyle(2, 0x8b7355, 1);
            icon.lineBetween(
                x + size / 2 - 6,
                y + size / 2,
                x + size / 2 + 6,
                y + size / 2,
            );
            icon.lineBetween(
                x + size / 2,
                y + size / 2 - 6,
                x + size / 2,
                y + size / 2 + 6,
            );
            icon.fillStyle(0x8b7355, 1);
            icon.fillCircle(x + size / 2, y + size / 2, 2);
        } else if (upgradeType === "fireRate") {
            // Fire rate icon: improved flame
            icon.fillStyle(0xff7722, 1);
            icon.beginPath();
            icon.moveTo(x + size / 2, y + 12);
            icon.lineTo(x + size / 2 + 8, y + 22);
            icon.lineTo(x + size / 2 + 4, y + 28);
            icon.lineTo(x + size / 2 + 10, y + 35);
            icon.lineTo(x + size / 2, y + 42);
            icon.lineTo(x + size / 2 - 10, y + 35);
            icon.lineTo(x + size / 2 - 4, y + 28);
            icon.lineTo(x + size / 2 - 8, y + 22);
            icon.closePath();
            icon.fillPath();

            // Flame highlight
            icon.fillStyle(0xffaa44, 0.7);
            icon.beginPath();
            icon.moveTo(x + size / 2, y + 15);
            icon.lineTo(x + size / 2 + 5, y + 25);
            icon.lineTo(x + size / 2, y + 32);
            icon.lineTo(x + size / 2 - 5, y + 25);
            icon.closePath();
            icon.fillPath();
        }
        this.upgradeMenuContainer.push(icon);

        // Level text in corner - improved visibility
        const levelText = this.add.text(x + size - 12, y + 5, `Lv${level}`, {
            fontSize: "11px",
            fill: "#d4af37",
            fontStyle: "bold",
            fontFamily: "serif",
            stroke: "#1a1410",
            strokeThickness: 2,
        });
        levelText.setScrollFactor(0);
        this.upgradeMenuContainer.push(levelText);

        // Cost text - improved visibility
        const costText = this.add.text(
            x + size / 2,
            y + size - 14,
            `${cost}g`,
            {
                fontSize: "11px",
                fill: "#d4af37",
                align: "center",
                fontStyle: "bold",
                fontFamily: "serif",
                stroke: "#1a1410",
                strokeThickness: 2,
            },
        );
        costText.setOrigin(0.5, 0);
        costText.setScrollFactor(0);
        this.upgradeMenuContainer.push(costText);

        // Label text below icon - larger and more readable
        const labelText = this.add.text(x + size / 2, y + size + 8, label, {
            fontSize: "12px",
            fill: "#d4af37",
            fontStyle: "bold",
            align: "center",
            fontFamily: "serif",
            stroke: "#1a1410",
            strokeThickness: 2,
        });
        labelText.setOrigin(0.5, 0);
        labelText.setScrollFactor(0);
        this.upgradeMenuContainer.push(labelText);

        // Make clickable with visual feedback
        const button = this.add.zone(x + size / 2, y + size / 2, size, size);
        button.setScrollFactor(0);
        button.setInteractive({ useHandCursor: true });

        // Hover effect
        button.on("pointerover", () => {
            this.tweens.add({
                targets: bg,
                alpha: 1.15,
                duration: 100,
            });
        });

        button.on("pointerout", () => {
            this.tweens.add({
                targets: bg,
                alpha: 1,
                duration: 100,
            });
        });

        // Click handler with press effect
        button.on("pointerdown", (pointer) => {
            pointer.event.stopPropagation();

            // Darken for press effect
            const originalColor = 0x9d8b6e;
            const pressedColor = 0x6a5a42;

            bg.clear();
            bg.fillStyle(pressedColor, 1); // Darken on press
            bg.fillRect(x, y, size, size);

            // Redraw borders
            bg.lineStyle(4, 0x3a2a18, 1);
            bg.strokeRect(x, y, size, size);
            bg.lineStyle(2, 0x8b7355, 1);
            bg.strokeRect(x + 3, y + 3, size - 6, size - 6);
            bg.lineStyle(1, 0xa89878, 0.8);
            bg.strokeRect(x + 1, y + 1, size - 2, size - 2);

            // Delay upgrade to allow press effect to complete
            this.time.delayedCall(150, () => {
                this.upgradeTower(tower, upgradeType);
            });

            // Return to normal color after press
            this.time.delayedCall(150, () => {
                if (bg && bg.active) {
                    bg.clear();
                    bg.fillStyle(originalColor, 1);
                    bg.fillRect(x, y, size, size);

                    // Redraw borders
                    bg.lineStyle(4, 0x3a2a18, 1);
                    bg.strokeRect(x, y, size, size);
                    bg.lineStyle(2, 0xb8a88e, 1);
                    bg.strokeRect(x + 3, y + 3, size - 6, size - 6);
                    bg.lineStyle(1, 0xa89878, 0.8);
                    bg.strokeRect(x + 1, y + 1, size - 2, size - 2);
                }
            });
        });
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
        // Only block towers directly on the target tile
        const targetX = this.gridWidth - 1;
        const targetY = this.gridHeight - 2;

        // Don't place on the target itself
        if (gridX === targetX && gridY === targetY) {
            return false;
        }

        // Allow placement anywhere else - enemies can navigate around
        return true;
    }

    onPointerDown(pointer) {
        // Don't place towers if clicking on UI elements (upgrade menu area)
        // Menu is positioned at screen coordinates with scroll factor 0
        const screenX = pointer.x; // Screen coordinates, not world
        const screenY = pointer.y;
        const menuX = 10;
        const menuWidth = 430;
        const menuStartY = this.gridHeight * this.gridSize + 5 - 209;
        const menuHeight = 209;

        // Only block if clicking inside the menu box (both X and Y must be within bounds)
        if (
            screenX >= menuX &&
            screenX <= menuX + menuWidth &&
            screenY >= menuStartY &&
            screenY <= menuStartY + menuHeight
        ) {
            return;
        }

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
                    this.gridWidth - 1,
                    this.gridHeight - 2,
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

        const waveMessage = this.add.text(
            512,
            384,
            `Wave ${this.wave} starting! ${this.waveEnemiesTotal} enemies`,
            {
                fontSize: "36px",
                fill: "#d4af37",
                fontFamily: "serif",
                fontStyle: "bold",
                stroke: "#1a1410",
                strokeThickness: 3,
                align: "center",
            },
        );
        waveMessage.setOrigin(0.5, 0.5);
        waveMessage.setScrollFactor(0);

        // Fade out the message after 2 seconds
        this.tweens.add({
            targets: waveMessage,
            alpha: 0,
            duration: 1000,
            delay: 1500,
            onComplete: () => waveMessage.destroy(),
        });

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
        this.requestPath(0, 0, this.gridWidth - 1, this.gridHeight - 2, enemy);
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

