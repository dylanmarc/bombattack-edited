const { TILE_SIZE, EMPTY_CELL, DESTRUCTIBLE_CELL, NON_DESTRUCTIBLE_CELL, SKINS } = require('../constants');

var { Player } = require('./player');
var { Bomb } = require('./bomb.js');

var uuidv4 = require('uuid/v4');
var faker = require('faker');

class Game {

  constructor({ map_name }) {
    this.id           = uuidv4();
    this.name         = faker.commerce.color()
    this.map_name     = map_name;

    this.layer_info   = require('../../client/maps/' + this.map_name + '.json').layers[0]
    this.max_players  = 11

    this.players     = {}
    this.playerSkins = SKINS.slice()

    // Generate shadow_map first
    this.shadow_map   = this.createMapData();

    // Generate spawn points from empty cells
    this.playerSpawns = [];
    for (let row = 0; row < this.shadow_map.length; row++) {
      for (let col = 0; col < this.shadow_map[row].length; col++) {
        if (this.shadow_map[row][col] === EMPTY_CELL) {
          this.playerSpawns.push({ col: col, row: row });
        }
      }
    }

    this.spoils       = new Map();
    this.bombs        = new Map();
  }

  addPlayer(id) {
    let skin = this.getAndRemoveSkin()
    let [spawn, spawnOnGrid] = this.getAndRemoveSpawn()

    let player = new Player({ id: id, skin: skin, spawn: spawn, spawnOnGrid: spawnOnGrid })
    this.players[player.id] = player
  }

  removePlayer(id) {
    let player = this.players[id];

    this.playerSkins.push(player.skin)
    this.playerSpawns.push(player.spawnOnGrid)

    delete this.players[id];
  }

  isEmpty() {
    return Object.keys(this.players).length === 0
  }

  isFull() {
    return Object.keys(this.players).length === this.max_players
  }

  getAndRemoveSkin() {
    // NOTE: we can user here simple .pop()
    let index = Math.floor(Math.random() * this.playerSkins.length);
    let randomSkin = this.playerSkins[index];
    this.playerSkins.splice(index, 1);

    return randomSkin;
  }

  getAndRemoveSpawn() {
    if (this.playerSpawns.length === 0) {
      // Regenerate spawn points if we've run out
      this.playerSpawns = [];
      for (let row = 0; row < this.shadow_map.length; row++) {
        for (let col = 0; col < this.shadow_map[row].length; col++) {
          if (this.shadow_map[row][col] === EMPTY_CELL) {
            // Check if this cell is safe (not near walls)
            if (this.isSafeSpawn(row, col)) {
              this.playerSpawns.push({ col: col, row: row });
            }
          }
        }
      }
    }
  
    const index = Math.floor(Math.random() * this.playerSpawns.length);
    const spawnOnGrid = this.playerSpawns[index];
    const spawn = { 
      x: spawnOnGrid.col * TILE_SIZE + TILE_SIZE/2, 
      y: spawnOnGrid.row * TILE_SIZE + TILE_SIZE/2 
    };
    
    return [spawn, spawnOnGrid];
  }

  isSafeSpawn(row, col) {
    // Check surrounding cells for safety
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const checkRow = row + i;
        const checkCol = col + j;
        
        if (checkRow < 0 || checkRow >= this.shadow_map.length ||
            checkCol < 0 || checkCol >= this.shadow_map[0].length) {
          return false;
        }
        
        if (this.shadow_map[checkRow][checkCol] !== EMPTY_CELL) {
          return false;
        }
      }
    }
    return true;
  }

  createMapData() {
    let tiles  = this.layer_info.data
    let width  = this.layer_info.width
    let height = this.layer_info.height
    let empty  = this.layer_info.properties.empty
    let wall   = this.layer_info.properties.wall
    let balk   = this.layer_info.properties.balk

    let mapMatrix = [];
    let i = 0;

    for(let row = 0; row < height; row++) {
      mapMatrix.push([]);

      for(let col = 0; col < width; col++) {
        mapMatrix[row][col] = EMPTY_CELL;

        if(tiles[i] == balk) {
          mapMatrix[row][col] = DESTRUCTIBLE_CELL;
        } else if(tiles[i] == wall) {
          mapMatrix[row][col] = NON_DESTRUCTIBLE_CELL;
        }

        i++;
      }
    }

    return mapMatrix;
  }

  addBomb({ col, row, power, ownerId }) {
    let bomb = new Bomb({ game: this, col: col, row: row, power: power, ownerId: ownerId });
    if ( this.bombs.get(bomb.id) ) {
      return false
    }
    this.bombs.set(bomb.id, bomb);
    return bomb
  }

  getMapCell(row, col) {
    return this.shadow_map[row][col]
  }

  nullifyMapCell(row, col) {
    this.shadow_map[row][col] = EMPTY_CELL
  }

  findSpoil(spoil_id){
    return this.spoils.get(spoil_id)
  }

  addSpoil(spoil) {
    this.spoils.set(spoil.id, spoil);
  }

  deleteSpoil(spoil_id){
    this.spoils.delete(spoil_id)
  }
}

exports.Game = Game;
