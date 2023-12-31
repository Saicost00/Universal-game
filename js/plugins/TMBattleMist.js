﻿//=============================================================================
// TMPlugin - Battle Mist
// Version: 2.1.0
// Last updated: 2018/11/28
// Website　　: https://hikimoki.sakura.ne.jp/
//-----------------------------------------------------------------------------
// Copyright (c) 2016 tomoaky
// Released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @plugindesc Displays a fog in a battle scene.
 *
 * @author tomoaky (https://hikimoki.sakura.ne.jp/)
 *
 * @param mistImage
 * @desc Image file name for fog.
 * default: mist
 * @default mist
 * @require 1
 * @dir img/system/
 * @type file
 *
 * @param mistNumber
 * @desc Number of fog sprites to display.
 * default: 32
 * @default 32
 *
 * @param mistTopSide
 * @desc Coordinates of the top edge for fog display in sideview.
 * default: 200
 * @default 200
 *
 * @param mistRangeSide
 * @desc Y-direction range to display fog in sideview.
 * default: 300
 * @default 300
 *
 * @param mistTopFront
 * @desc Coordinates of the top fog display range in frontview.
 * default: 240
 * @default 240
 *
 * @param mistRangeFront
 * @desc Range of Y direction to display fog in frontview.
 * default: 340
 * @default 340
 *
 * @param mistScale
 * @desc Fog sprite zoom.
 * default: 1
 * @default 1
 *
 * @param mistOpacityMax
 * @desc Maximum opacity of the fog sprite.
 * default: 224
 * @default 224
 *
 * @help
 * TMPlugin - Battle Mist ver2.1.0
 *
 * Usage:
 *
 *   Require an image file in img/system folder-
 *   image is mist.png
 *   If you need to change name of the file,
 *   change the name of the file through mistImage parameter.
 *
 *   Game resolution is set to 816*624, if the resolution is changed,
 *   the display may be distorted.
 *   Be sure to adjust the value of the plugin parameter.
 *
 *   This plugin has been tested on RPG Maker MV Version 1.6.1.
 *
 *   This plugin is released under MIT license, ok for commercial use.
 *   You can use it freely, whether modification and redistribution.
 *
 * 
 * Plugin commands:
 *
 *   stopMist
 *     Disable battle mist. Can be recorded in save data.
 *     Fog disappears when startMist command is used.
 *
 *   startMist
 *     Activates the disabled battle mist.
 *
 *   onMistMirror
 *     Reverses the direction of fog movement.
 *     This function is only for side view.
 *     Can be reversed until the offMistMirror command.
 *
 *   offMistMirror
 *     Releases the fog movement for inverted direction.
 * 
 *   setFrontMist
 *     Sets the fog flow same as the front view.
 * 
 *   setSideMist
 *     Sets the fog flow same as the side view.
 */

var Imported = Imported || {};
Imported.TMBattleMist = true;

var TMPlugin = TMPlugin || {};
TMPlugin.BattleMist = {};
TMPlugin.BattleMist.Parameters = PluginManager.parameters('TMBattleMist');
TMPlugin.BattleMist.MistImage = TMPlugin.BattleMist.Parameters['mistImage'] || 'mist';
TMPlugin.BattleMist.MaxMists = +(TMPlugin.BattleMist.Parameters['mistNumber'] || 32);
TMPlugin.BattleMist.TopSide = +(TMPlugin.BattleMist.Parameters['mistTopSide'] || 200);
TMPlugin.BattleMist.RangeSide = +(TMPlugin.BattleMist.Parameters['mistRangeSide'] || 300);
TMPlugin.BattleMist.TopFront = +(TMPlugin.BattleMist.Parameters['mistTopFront'] || 240);
TMPlugin.BattleMist.RangeFront = +(TMPlugin.BattleMist.Parameters['mistRangeFront'] || 340);
TMPlugin.BattleMist.Scale = +(TMPlugin.BattleMist.Parameters['mistScale'] || 1);
TMPlugin.BattleMist.OpacityMax = +(TMPlugin.BattleMist.Parameters['mistOpacityMax'] || 224);

(function() {

	//-----------------------------------------------------------------------------
	// Game_System
	//

	Game_System.prototype.isMistEnabled = function() {
		if (this._mistEnabled === undefined) this._mistEnabled = true;
		return this._mistEnabled;
	};

	Game_System.prototype.disableMist = function() {
		this._mistEnabled = false;
	};

	Game_System.prototype.enableMist = function() {
		this._mistEnabled = true;
	};
	
	Game_System.prototype.mistMirror = function() {
		return this._mistMirror;
	};

	Game_System.prototype.setMistMirror = function(mirror) {
		this._mistMirror = mirror;
	};

	Game_System.prototype.isSideMist = function() {
		if (!this._mistDirection) {
			return this.isSideView();
		}
		return this._mistDirection === 6;
	};

	Game_System.prototype.setMistDirection = function(direction) {
		this._mistDirection = direction;
	};

	//-----------------------------------------------------------------------------
	// Game_Interpreter
	//

	var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		_Game_Interpreter_pluginCommand.call(this, command, args);
		if (command === 'startMist') {
			$gameSystem.enableMist();
		} else if (command === 'stopMist') {
			$gameSystem.disableMist();
		} else if (command === 'onMistMirror') {
			$gameSystem.setMistMirror(true);
		} else if (command === 'offMistMirror') {
			$gameSystem.setMistMirror(false);
		} else if (command === 'setFrontMist') {
			$gameSystem.setMistDirection(2);
		} else if (command === 'setSideMist') {
			$gameSystem.setMistDirection(6);
		}
	};
	
	//-----------------------------------------------------------------------------
	// Sprite_BattleMist
	//

	function Sprite_BattleMist() {
		this.initialize.apply(this, arguments);
	}

	Sprite_BattleMist.prototype = Object.create(Sprite.prototype);
	Sprite_BattleMist.prototype.constructor = Sprite_BattleMist;

	Sprite_BattleMist.prototype.initialize = function() {
		Sprite.prototype.initialize.call(this);
		this.loadBitmap();
		this.blendMode = 1;
		this.z = 5;
		this.anchor.x = 0.5;
		this.anchor.y = 1;
	};

	Sprite_BattleMist.prototype.loadBitmap = function() {
		this.bitmap = ImageManager.loadSystem(TMPlugin.BattleMist.MistImage);
	};

	Sprite_BattleMist.prototype.setRandomPosition = function() {
		if ($gameSystem.isSideMist()) {
			this.resetSideView();
			var w = this.width * this.scale.x;
			this.x = Math.random() * (Graphics.width + w) - w / 2 - this.parent.x;
		} else {
			this.resetFrontView();
			this.y = Math.random() * TMPlugin.BattleMist.RangeFront + TMPlugin.BattleMist.TopFront;
		}
		this.update();
	};

	Sprite_BattleMist.prototype.resetSideView = function() {
		var r = Math.random();
		this._count = Math.floor(Math.random() * 180);
		this.y = r * TMPlugin.BattleMist.RangeSide + TMPlugin.BattleMist.TopSide;
		r = (r + 0.5) * TMPlugin.BattleMist.Scale;
		this.scale.set(r, r);
		this._vx = this.scale.x * 2 - 0.5;
		if ($gameSystem.mistMirror()) {
			this.x = Graphics.width + this.width / 2 * this.scale.x;
			this._vx = 0 - this._vx;
		} else {
			this.x = -this.width / 2 * this.scale.x;
		}
		this.x -= this.parent.x;
	};

	Sprite_BattleMist.prototype.resetFrontView = function() {
		var r = Math.random();
		this.x = r * Graphics.width;
		this.y = TMPlugin.BattleMist.TopFront;
		this._vx = (this.x - Graphics.width / 2) * 0.01;
		this.x -= this.parent.x;
	};

	Sprite_BattleMist.prototype.update = function() {
		Sprite.prototype.update.call(this);
		if ($gameSystem.isSideMist()) {
			this.updateSideView();
		} else {
			this.updateFrontView();
		}
	};

	Sprite_BattleMist.prototype.updateSideView = function() {
		this.x += this._vx;
		this._count++;
		if (this._count >= 180) {
			this._count = 0;
		}
		this.opacity = TMPlugin.BattleMist.OpacityMax - 16 + Math.sin(this._count * Math.PI / 90) * 16;
		if ($gameSystem.mistMirror()) {
			if (this.x + this.width / 2 * this.scale.x < 0 - this.parent.x) {
				this.resetSideView();
			}
		} else {
			if (this.x - this.width / 2 * this.scale.x > Graphics.width - this.parent.x) {
				this.resetSideView();
			}
		}
	};

	Sprite_BattleMist.prototype.updateFrontView = function() {
		this.x += this._vx;
		this.y += TMPlugin.BattleMist.Scale;
		var w = this.width / 2;
		if (this.y > TMPlugin.BattleMist.RangeFront + TMPlugin.BattleMist.TopFront ||
				this.x < 0 - w - this.parent.x || this.x > Graphics.width + w - this.parent.x) {
			this.resetFrontView();
		}
		this.updateScaleFront();
		this.updateOpacityFront();
	};

	Sprite_BattleMist.prototype.updateScaleFront = function() {
		var r = (0.5 + (this.y - TMPlugin.BattleMist.TopFront) / TMPlugin.BattleMist.RangeFront) *
				TMPlugin.BattleMist.Scale;
		this.scale.set(r, r);
	};

	Sprite_BattleMist.prototype.updateOpacityFront = function() {
		var borderY = TMPlugin.BattleMist.TopFront + TMPlugin.BattleMist.RangeFront * 0.8;
		if (this.y > borderY) {
			this.opacity = (1 - (this.y - borderY) / (TMPlugin.BattleMist.RangeFront * 0.2)) *
					TMPlugin.BattleMist.OpacityMax;
		} else {
			this.opacity = Math.min((this.y - TMPlugin.BattleMist.TopFront) / TMPlugin.BattleMist.Scale * 8,
					TMPlugin.BattleMist.OpacityMax);
		}
	};

	//-----------------------------------------------------------------------------
	// Spriteset_Battle
	//

	var _Spriteset_Battle_createLowerLayer = Spriteset_Battle.prototype.createLowerLayer;
	Spriteset_Battle.prototype.createLowerLayer = function() {
		_Spriteset_Battle_createLowerLayer.call(this);
		this.createMists();
		this._back1Sprite.z = 0;
		this._back2Sprite.z = 1;
		for (var i = 0; i < this._enemySprites.length; i++) {
			this._enemySprites[i].z = 5;
		}
		this.updateActors();
		for (var j = 0; j < this._actorSprites.length; j++) {
			this._actorSprites[j].z = 5;
		}
	};

	Spriteset_Battle.prototype.createMists = function() {
		this._mistSprites = [];
		if ($gameSystem.isMistEnabled()) {
			for (var i = 0; i < TMPlugin.BattleMist.MaxMists; i++) {
				this._mistSprites[i] = new Sprite_BattleMist();
				this._battleField.addChild(this._mistSprites[i]);
				this._mistSprites[i].setRandomPosition();
			}
		}
	};

	var _Spriteset_Battle_update = Spriteset_Battle.prototype.update;
	Spriteset_Battle.prototype.update = function() {
		_Spriteset_Battle_update.call(this);
		this._sortBattleField();
	};
	
	Spriteset_Battle.prototype._sortBattleField = function() {
		this._battleField.children.sort(function(a, b) {
			a.z = a.z != null ? a.z : 10;
			b.z = b.z != null ? b.z : 10;
			if (a.z !== b.z) {
				return a.z - b.z;
			} else if (a.y !== b.y) {
				return a.y - b.y;
			} else {
				return a.spriteId - b.spriteId;
			}
		});
	};

})();
