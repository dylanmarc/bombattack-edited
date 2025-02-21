import { TILE_SIZE, PING } from '../utils/constants';
import { Text } from '../helpers/elements';

export default class EnemyPlayer extends Phaser.Sprite {

  constructor({ game, id, spawn, skin }) {
    super(game, spawn.x, spawn.y, 'bomberman_' + skin);

    this.game = game
    this.id = id;

    this.currentPosition = spawn;
    this.lastMoveAt = 0;

    this.game.physics.arcade.enable(this);
    this.body.setSize(20, 20, 6, 6);
    this.body.immovable = true;

    this.animations.add('up', [9, 10, 11], 15, true);
    this.animations.add('down', [0, 1, 2], 15, true);
    this.animations.add('right', [6, 7, 8], 15, true);
    this.animations.add('left', [3, 4, 5], 15, true);

    this.scoreText = game.add.text(this.x, this.y - 30, "0", {
      font: "16px Arial",
      fill: "#fff",
      stroke: "#000",
      strokeThickness: 3
    });
    this.scoreText.anchor.set(0.5);
    this.game.add.existing(this.scoreText);

    this.defineSelf(skin)
  }

  updateScoreDisplay(score) {
    this.scoreText.text = score;
    this.scoreText.bringToTop();
  }

  update() {
    if (!this.alive) return;

    this.scoreText.x = this.x;
    this.scoreText.y = this.y - 30;
  }

  becomesDead() {
    this.alive = false;
    this.kill();
    this.body.enable = false; // Disable physics
  }

  respawn(spawn) {
    this.reset(spawn.x, spawn.y);
    this.revive();
    this.alive = true;
    this.body.enable = true;
    this.currentPosition = spawn;
  }
  
  goTo(newPosition) {
    this.lastMoveAt = this.game.time.now;

    this.animateFace(newPosition);

    this.game.add.tween(this).to(newPosition, PING, Phaser.Easing.Linear.None, true);
  }

  animateFace(newPosition) {
    let face = 'down';
    let diffX = newPosition.x - this.currentPosition.x;
    let diffY = newPosition.y - this.currentPosition.y;

    if (diffX < 0) {
      face = 'left'
    } else if (diffX > 0) {
      face = 'right'
    } else if (diffY < 0) {
      face = 'up'
    } else if (diffY > 0) {
      face = 'down'
    }

    this.animations.play(face)
    this.currentPosition = newPosition;
  }

  defineSelf(name) {
    let playerText = new Text({
      game: this.game,
      x: TILE_SIZE / 2,
      y: -10,
      text: name,
      style: {
        font: '14px Areal',
        fill: '#FFFFFF',
          stroke: '#000000',
          strokeThickness: 3
      }
    })

    this.addChild(playerText);
  }
}
