import { findFrom, findAndDestroyFrom } from '../utils/utils';
import { TILESET, LAYER, TILE_SIZE } from '../utils/constants';

import Player from '../entities/player';
import EnemyPlayer from '../entities/enemy_player';
import Bomb from '../entities/bomb';
import Spoil from '../entities/spoil';
import FireBlast from '../entities/fire_blast';
import Bone from '../entities/bone';

class Play extends Phaser.State {
  init(game) {
    this.currentGame = game
  }

  create() {
    this.createMap();
    this.createPlayers();
    this.setEventHandlers();

    this.game.time.events.loop(400 , this.stopAnimationLoop.bind(this));
  }

  update() {
    this.game.physics.arcade.collide(this.player, this.blockLayer);
    // this.game.physics.arcade.collide(this.player, this.enemies);
    this.game.physics.arcade.collide(this.player, this.bombs);

    this.game.physics.arcade.overlap(this.player, this.spoils, this.onPlayerVsSpoil, null, this);
    this.game.physics.arcade.overlap(this.player, this.blasts, this.onPlayerVsBlast, null, this);
  }

  createMap() {
    this.map = this.add.tilemap(this.currentGame.map_name);

    this.map.addTilesetImage(TILESET);

    this.blockLayer = this.map.createLayer(LAYER);
    this.blockLayer.resizeWorld();

    this.map.setCollision(this.blockLayer.layer.properties.collisionTiles)

    this.player  = null;
    this.bones   = this.game.add.group();
    this.bombs   = this.game.add.group();
    this.spoils  = this.game.add.group();
    this.blasts  = this.game.add.group();
    this.enemies = this.game.add.group();

    this.game.physics.arcade.enable(this.blockLayer);
  }

  createPlayers() {
    for (let player of Object.values(this.currentGame.players)) {
      let setup = {
        game:   this.game,
        id:     player.id,
        spawn:  player.spawn,
        skin:   player.skin
      }

      if (player.id === clientSocket.id) {
        this.player = new Player(setup);
      } else {
        this.enemies.add(new EnemyPlayer(setup))
      }
    }
  }

  setEventHandlers() {
    clientSocket.on('move player', this.onMovePlayer.bind(this));
    // clientSocket.on('player win', this.onPlayerWin.bind(this));
    clientSocket.on('show bomb', this.onShowBomb.bind(this));
    clientSocket.on('detonate bomb', this.onDetonateBomb.bind(this));
    clientSocket.on('spoil was picked', this.onSpoilWasPicked.bind(this));
    clientSocket.on('show bones', this.onShowBones.bind(this));
    clientSocket.on('player disconnect', this.onPlayerDisconnect.bind(this));
    clientSocket.on('player died', this.onPlayerDied.bind(this));
    clientSocket.on('player respawned', this.onPlayerRespawned.bind(this));

    clientSocket.on('update score', ({ player_id, score }) => {
      const player = player_id === this.player.id ? this.player : findFrom(player_id, this.enemies);
      if (player) {
        player.updateScoreDisplay(score);
      }
    });
    
    clientSocket.on('player win', ({ winner, skin }) => {
      //add text to say that player has won
      this.game.add.text(400, 300, `${winner} has won!`, {
        font: "32px Arial",
        fill: "#fff",
        stroke: "#000",
        strokeThickness: 3
      });

      //wait 3 seconds before going to win state
      this.game.time.events.add(4000, () => {
      this.state.start('Win', true, false, skin);
      });
    });
  }

  onPlayerDied({ player_id }) {
    const player = player_id === this.player.id ? this.player : findFrom(player_id, this.enemies);
  
    if (player) {
      player.becomesDead(); // This should handle the visual "death" (e.g., hide the player)
  
      // Show bones at death location
      const col = Math.floor(player.x / TILE_SIZE);
      const row = Math.floor(player.y / TILE_SIZE);
      this.bones.add(new Bone(this.game, col, row));
    }
  }

  onPlayerRespawned({ player_id, spawn }) {
    const player = player_id === this.player.id ? this.player : findFrom(player_id, this.enemies);
    
    if (player) {
      player.reset(spawn.x, spawn.y);
      player.revive();
      player.currentPosition = spawn;
      
      if (player_id === this.player.id) {
        player.info.deadText.visible = false;
        player.body.enable = true;
      }
    }
  }

  onPlayerVsSpoil(player, spoil) {
    clientSocket.emit('pick up spoil', { spoil_id: spoil.id });
    spoil.kill();
  }

  onPlayerVsBlast(player, blast) {
    if (player.alive) {
      clientSocket.emit('player died', { player_id: player.id, col: player.currentCol(), row: player.currentRow(), killer_id: blast.bomber_id});
      player.becomesDead()
    }
  }

  onMovePlayer({ player_id, x, y }) {
    let enemy = findFrom(player_id, this.enemies);
    if (!enemy) { return }

    enemy.goTo({ x: x, y: y })
  }

  stopAnimationLoop() {
    for (let enemy of this.enemies.children) {
      if (enemy.lastMoveAt < this.game.time.now - 200) {
        enemy.animations.stop();
      }
    }
  }

  onShowBomb({ bomb_id, col, row }) {
    this.bombs.add(new Bomb(this.game, bomb_id, col, row));
  }

  onDetonateBomb({ bomb_id, bomber_id, blastedCells }) {
    // Remove Bomb:
    findAndDestroyFrom(bomb_id, this.bombs)

    // Render Blast:
    for (let cell of blastedCells) {
      this.blasts.add(new FireBlast(this.game, cell, bomber_id));
    };

    // Destroy Tiles:
    for (let cell of blastedCells) {
      if (!cell.destroyed) { continue }

      this.map.putTile(this.blockLayer.layer.properties.empty, cell.col, cell.row, this.blockLayer);
    };

    // Add Spoils:
    for (let cell of blastedCells) {
      if (!cell.destroyed) { continue }
      if (!cell.spoil) { continue }

      this.spoils.add(new Spoil(this.game, cell.spoil));
    };
  }

  onSpoilWasPicked({ player_id, spoil_id, spoil_type }){
    if (player_id === this.player.id){
      this.player.pickSpoil(spoil_type)
    }

    findAndDestroyFrom(spoil_id, this.spoils)
  }

  onShowBones({ player_id, col, row }) {
    this.bones.add(new Bone(this.game, col, row));

    // findAndDestroyFrom(player_id, this.enemies)
  }

  onPlayerWin(winner_skin) {
    clientSocket.emit('leave game');

    this.state.start('Win', true, false, winner_skin);
  }

  onPlayerDisconnect({ player_id }) {
    findAndDestroyFrom(player_id, this.enemies);

    if (this.enemies.children.length >= 1) { return }

    this.onPlayerWin()
  }
}

export default Play;
