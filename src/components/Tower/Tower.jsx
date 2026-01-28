import Phaser from "phaser";

export class Tower extends Phaser.GameObjects.Graphics {
    constructor(scene, x, y, gridSize = 64) {
        super(scene, x, y);

        this.scene = scene;
        this.gridSize = gridSize;
        this.fireRate = 1000;
        this.lastFireTime = 0;
        this.range = 150;
        this.damage = 25;
        this.target = null;
        this.isSelected = false;
        this.cost = 100;
        this.barrelAngle = 0;

        if (scene && scene.add) {
            scene.add.existing(this);
        }

        this.setInteractive({
            hitArea: new Phaser.Geom.Circle(0, 0, 32),
            hitAreaCallback: Phaser.Geom.Circle.Contains,
        });
        this.on("pointerdown", () => this.select());

        this.drawTower();
    }

    drawTower() {
        this.clear();

        // Stone tower base (tapered)
        this.fillStyle(0x8b7355, 1); // Brown stone color
        this.fillRect(-20, 10, 40, 38);

        // Stone texture lines
        this.lineStyle(1, 0x6b5345, 0.5);
        for (let i = 0; i < 4; i++) {
            this.lineBetween(-20, 20 + i * 10, 20, 20 + i * 10);
        }

        // Tower top platform
        this.fillStyle(0x6b5345, 1); // Darker stone
        this.fillRect(-24, 0, 48, 12);

        // Crenellations (battlements) - 5 blocks
        this.fillStyle(0x8b7355, 1);
        for (let i = 0; i < 5; i++) {
            const x = -22 + i * 11;
            if (i % 2 === 0) {
                this.fillRect(x, -8, 9, 8);
            }
        }

        // Archer on top (body stays still, only head/bow rotate)
        const angle = this.barrelAngle;

        // Archer body (torso) - stays vertical
        this.fillStyle(0x8b4513, 1); // Brown tunic
        this.fillRect(-3, -10, 6, 8);

        // Archer legs
        this.fillStyle(0x654321, 1); // Dark brown pants
        this.fillRect(-3, -2, 2.5, 5);
        this.fillRect(0.5, -2, 2.5, 5);

        // Archer head (rotates to face target)
        this.fillStyle(0xffdbac, 1); // Skin color
        const headOffsetX = Math.cos(angle) * 2;
        const headOffsetY = Math.sin(angle) * 2;
        this.fillCircle(headOffsetX, -12 + headOffsetY, 3);

        // Bow (held to the side, points at target)
        this.lineStyle(2, 0x654321, 1); // Dark brown bow
        const bowDistance = 6;
        const bowX = Math.cos(angle) * bowDistance;
        const bowY = Math.sin(angle) * bowDistance;

        // Bow arc
        const bowStart = angle - Math.PI / 3;
        const bowEnd = angle + Math.PI / 3;
        this.beginPath();
        this.arc(bowX - 6, bowY - 6, 8, bowStart, bowEnd);
        this.strokePath();

        // Bow string
        this.lineStyle(1, 0xcccccc, 1);
        const stringStartX = bowX + Math.cos(bowStart) * 8 - 6;
        const stringStartY = bowY + Math.sin(bowStart) * 8 - 6;
        const stringEndX = bowX + Math.cos(bowEnd) * 8 - 6;
        const stringEndY = bowY + Math.sin(bowEnd) * 8 - 6;
        this.lineBetween(stringStartX, stringStartY, stringEndX, stringEndY);

        // Selection outline
        if (this.isSelected) {
            this.lineStyle(2, 0xffff00, 1);
            this.strokeCircle(0, 0, 35);
        }
    }

    place(gridX, gridY, cellSize = 64) {
        this.gridSize = cellSize;
        this.setPosition(
            gridX * cellSize + cellSize / 2,
            gridY * cellSize + cellSize / 2,
        );
        this.setActive(true).setVisible(true);
        this.drawTower();
        return this;
    }

    select() {
        this.isSelected = true;
        this.drawTower();
    }

    deselect() {
        this.isSelected = false;
        this.drawTower();
    }

    findTarget(enemies) {
        if (!enemies || enemies.length === 0) {
            this.target = null;
            return null;
        }

        let closest = null;
        let closestDistance = this.range;

        for (let enemy of enemies) {
            if (!enemy.active) continue;
            const distance = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                enemy.x,
                enemy.y,
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closest = enemy;
            }
        }

        this.target = closest;
        return closest;
    }

    shoot() {
        if (!this.target || !this.target.active) {
            this.target = null;
            return;
        }

        const now = this.scene.time.now;
        if (now - this.lastFireTime < this.fireRate) return;

        this.lastFireTime = now;

        const angle = Phaser.Math.Angle.Between(
            this.x,
            this.y,
            this.target.x,
            this.target.y,
        );

        this.scene.addBullet(this.x, this.y, angle, this.damage);
    }

    update() {
        if (this.scene && this.scene.enemies) {
            if (!this.findTarget(this.scene.enemies)) {
                this.target = null;
            } else {
                // Update barrel rotation to face target
                if (this.target && this.target.active) {
                    const angle = Phaser.Math.Angle.Between(
                        this.x,
                        this.y,
                        this.target.x,
                        this.target.y,
                    );
                    this.barrelAngle = angle + Math.PI / 2; // Add 90 degrees since barrel points up
                    this.drawTower();
                }
                this.shoot();
            }
        }
    }
}

