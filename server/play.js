var Lobby = require("./lobby");
var { Game } = require("./entity/game");
var TILE_SIZE = require("./constants");

var runningGames = new Map();

var Play = {
  onLeaveGame: function (data) {
    runningGames.delete(this.socket_game_id);

    this.leave(this.socket_game_id);
    this.socket_game_id = null;
  },

  onStartGame: function () {
    let game = Lobby.deletePendingGame(this.socket_game_id);
    runningGames.set(game.id, game);

    serverSocket.sockets.in(game.id).emit("launch game", game);
  },

  updatePlayerPosition: function (coordinates) {
    let game_id = this.socket_game_id;
    let current_game = runningGames.get(game_id);
    if (!current_game) return;
  
    let current_player = current_game.players[this.id];
    if (!current_player) return;
  
    const col = Math.floor(coordinates.x / TILE_SIZE);
    const row = Math.floor(coordinates.y / TILE_SIZE);
    current_player.updatePosition(col, row);
  
    // Broadcast to other players
    this.broadcast.to(game_id).emit("move player", {
      player_id: this.id,
      x: coordinates.x,
      y: coordinates.y,
    });
  },

  onDisconnectFromGame: function () {
    let current_game = runningGames.get(this.socket_game_id);

    if (current_game) {
      serverSocket.sockets
        .in(this.socket_game_id)
        .emit("player disconnect", { player_id: this.id });
    }
  },

  createBomb: function ({ col, row }) {
    let game_id = this.socket_game_id;
    let current_game = runningGames.get(game_id);
    if (!current_game?.players) {
      console.log("falsy players!!", current_game.players);
      return;
    }
    let current_player = current_game.players[this.id];

    let bomb = current_game.addBomb({
      col: col,
      row: row,
      power: current_player.power,
      ownerId: current_player.id // Add owner reference
    });
  
    if (bomb) {
      setTimeout(() => {
        let blastedCells = bomb.detonate();

        serverSocket.sockets.to(game_id).emit('detonate bomb', { 
          bomb_id: bomb.id, 
          bomber_id: bomb.ownerId,
          blastedCells 
        });
      
        // Check for hit players
        // Object.values(current_game.players).forEach(player => {
        //   blastedCells.forEach(cell => {
        //     Object.values(current_game.players).forEach(player => {
        //       if (player.currentRow === cell.row && 
        //           player.currentCol === cell.col &&
        //           player.isAlive) {
        //             console.log(bomb.ownerId)
        //         player.dead(bomb.ownerId, current_game); // Pass killer ID
        //       }
        //     });
        //   });
        // });
      }, bomb.explosion_time);
  
      serverSocket.sockets
        .to(game_id)
        .emit("show bomb", { bomb_id: bomb.id, col: bomb.col, row: bomb.row });
    }
  },

  onPickUpSpoil: function ({ spoil_id }) {
    let game_id = this.socket_game_id;
    let current_game = runningGames.get(game_id);
    let current_player = current_game.players[this.id];

    let spoil = current_game.findSpoil(spoil_id);

    if (spoil) {
      current_game.deleteSpoil(spoil.id);

      current_player.pickSpoil(spoil.spoil_type);

      serverSocket.sockets
        .to(game_id)
        .emit("spoil was picked", {
          player_id: current_player.id,
          spoil_id: spoil.id,
          spoil_type: spoil.spoil_type,
        });
    }
  },

  onPlayerDied: function ({ player_id, killer_id }) {
    let game_id = this.socket_game_id;
    let current_game = runningGames.get(game_id);
    let current_player = current_game.players[player_id];
  
    if (!current_player) {
      console.log('Player not found:', player_id);
      return;
    }
  
    // Emit 'player died' event to all clients
    serverSocket.sockets.to(game_id).emit('player died', {
      player_id: player_id,
      killer_id: killer_id
    });
  
    // Emit 'show bones' event to all clients
    serverSocket.sockets.to(game_id).emit('show bones', {
      player_id: player_id,
      col: current_player.currentCol,
      row: current_player.currentRow
    });
  
    // Handle the player's death logic
    current_player.dead(killer_id, current_game);
  }

  // onPlayerDied: function ({ player_id, killer_id }) {
  //   console.log('{ player_id, killer_id }',{ player_id, killer_id })
  //   serverSocket.sockets
  //     .to(this.socket_game_id)
  //     .emit("show bones", { player_id });

  //     let game_id = this.socket_game_id;
  //     let current_game = runningGames.get(game_id);
  //     let current_player = current_game.players[player_id];
    
  //     if (!current_player) {
  //       console.log('Player not found:', player_id);
  //       return;
  //     }
    
  //     current_player.dead(killer_id, current_game);
  //   }
};

module.exports = Play;
