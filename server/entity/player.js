const { POWER, INITIAL_POWER, STEP_POWER, KILLS_TO_WIN } = require('../constants');

class Player {

  constructor({ id, skin, spawn, spawnOnGrid }) {
    this.id          = id;
    this.skin        = skin;
    this.spawn       = spawn;
    this.spawnOnGrid = spawnOnGrid;

    this.isAlive = true;

    this.power = INITIAL_POWER;
    this.kills = 0; // Track kills

    this.currentCol = spawnOnGrid.col;
    this.currentRow = spawnOnGrid.row;

  }

  updatePosition(col, row) {
    this.currentCol = col;
    this.currentRow = row;
  }

  pickSpoil(spoil_type) {
    if (spoil_type === POWER){
      this.power += STEP_POWER
    }
  }

  dead(killerId, game) {
    this.isAlive = false;
  
    if (killerId && game.players[killerId]) {
      const killer = game.players[killerId];

      //if killer is someone else, add to their score, if killer is themselves, subtract from their score
      if (killer.id !== this.id) {
        killer.kills++;
      } else {
        killer.kills--;
      }
      
      // Broadcast score update to all clients
      serverSocket.sockets.to(game.id).emit('update score', {
        player_id: killer.id,
        score: killer.kills
      });
  
      // Check for win condition
      if (killer.kills >= KILLS_TO_WIN) {
        serverSocket.sockets.to(game.id).emit('player win', {
          winner: killer.skin,
          skin: killer.skin
        });
      }
    }
  
    // Broadcast death and schedule respawn
    serverSocket.sockets.to(game.id).emit('player died', {
      player_id: this.id,
      killer_id: killerId
    });
    
    setTimeout(() => this.respawn(game), 3000);
  }

  respawn(game) {
    this.isAlive = true;
    const [spawn, spawnOnGrid] = game.getAndRemoveSpawn();
    this.spawn = spawn;
    this.spawnOnGrid = spawnOnGrid;
    
    serverSocket.sockets.to(game.id).emit('player respawned', {
      player_id: this.id,
      spawn: this.spawn
    });
  }

}

exports.Player = Player;
