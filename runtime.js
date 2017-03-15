// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

//NOTES RE: SONIC PHYSICS BEHAVIOUR
//This behaviour is based heavily off the Platform behaviour, adding things to allow physics closely mimicing that of the classic Sonic the Hedgehog games.
//The main features are:
//Ability to find the angle of the surface the platform object is on
//Changing the speed of movement based on that angle
//Walking up walls/ceilings provided the speed is above a threshold
//Following solid objects that rotate (think see-saws)
//Changing variable jumping (sorry, main thing that's outright replaced rather than "improved") to have a maximum and minimum jump and work between the two.

/////////////////////////////////////
// Behavior class
cr.behaviors.SonicPhysics = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var behaviorProto = cr.behaviors.SonicPhysics.prototype;
		
	/////////////////////////////////////
	// Behavior type class
	behaviorProto.Type = function(behavior, objtype)
	{
		this.behavior = behavior;
		this.objtype = objtype;
		this.runtime = behavior.runtime;
	};

	var behtypeProto = behaviorProto.Type.prototype;

	behtypeProto.onCreate = function()
	{
	};

	/////////////////////////////////////
	// Behavior instance class
	
	// animation modes
	var ANIMMODE_STOPPED = 0;
	var ANIMMODE_MOVING = 1;
	var ANIMMODE_JUMPING = 2;
	var ANIMMODE_FALLING = 3;
	
	behaviorProto.Instance = function(type, inst)
	{
		this.type = type;
		this.behavior = type.behavior;
		this.inst = inst;				// associated object instance to modify
		this.runtime = type.runtime;
		
		// Key states
		this.leftkey = false;
		this.rightkey = false;
		this.jumpkey = false;
		this.jumped = false;			// prevent bunnyhopping
		this.rollkey = false;
		this.rolling = false;
		this.ignoreInput = false;
		
		// Simulated controls
		this.simleft = false;
		this.simright = false;
		this.simjump = false;
		
		// Last floor object for moving platform
		this.lastFloorObject = null;
		this.loadFloorObject = -1;
		this.lastFloorX = 0;
		this.lastFloorY = 0;
		this.floorIsJumpthru = false;
		
		this.animMode = ANIMMODE_STOPPED;
		
		this.fallthrough = 0;			// fall through jump-thru.  >0 to disable, lasts a few ticks
		this.firstTick = true;
		
		// Movement
		this.dx = 0;
		this.dy = 0;
		
		//Surface angle
		this.surfaceAngle = 0;
		
		//Surface vectors (like rightx/y but with surfaceAngle)
		//Setting these up here because they're given a value at the end of each tick, after movement has occured
		this.surfacex = Math.cos(this.surfaceAngle);
		this.surfacey = Math.sin(this.surfaceAngle);
		
		//Wall mode
		this.wallMode = 0;
		
		//Last segment collided with (used with findSurfaceAngle function)
		this.lastSegment = -1;
		
		//Set the horizontal control lock timer to 0
		this.hlockTime = 0;
		
		//Make sure horizontal controls start off unlocked
		this.lockXControl = false;
		
		//And make sure that movement is enabled
		this.lockXMovement = false;
		this.lockYMovement = false;
		
		//Coordinates for loweer corners of instance bounding box
		//Behaviour really only works with a bounding box poly, so even if I can't enforce that I'll proceed assuming it is correct.
		this.blx = this.getCornerCoord(false, true);
		this.bly = this.getCornerCoord(false, false);
		this.brx = this.getCornerCoord(true, true);
		this.bry = this.getCornerCoord(true, false);
		
		//NEED SHORTER VARIABLE NAMES
		this.isLeftCornerColliding = false;
		this.isRightCornerColliding = false;
		
		//Keep track of the last colliding corner. Defaults to left, not sure whether it matters tho. If there's any obvious issues on startup only, this could
		//be to blame.
		this.lastCorner = -1;
		
		//Debug value that I can mess with to check stuff. REMOVE LATER!
		this.sonicPhysicsDebugVar = "";
		
		
	};

	var behinstProto = behaviorProto.Instance.prototype;
	
	//Get the corner coordinates
	//Only works when the collision poly is set to bounding box. At least it's here, though, so if I want to replace it I don't have to hunt around
	behinstProto.getCornerCoord = function(rightCorner, xCoord)
	{
		
		//update the bounding box/quad
		//More of a just-in-case thing. I'm sure it isn't efficient to update it more often than it needs to be, but I can't keep track of where it has/hasn't
		//been updated in a 3000-lines-and-growing file. This just makes it idiot-proof (or me-proof).
		this.inst.set_bbox_changed();
		this.inst.update_bbox();

		if (rightCorner) {
			return this.inst.bquad.at(2, xCoord);
		}
		else {
			return this.inst.bquad.at(3, xCoord);
		}
		
		
	}
	
	behinstProto.updateGravity = function()
	{
		//Make sure wallMode stays clamped
		if (this.wallMode < 0) {
			this.wallMode += 4;
		}
		else if (this.wallMode > 3) {
			this.wallMode -= 4;
		}
		
		//TEMPORARY: angle stuff!
		//Bit of a mess, bear with me here
		if (false) {
			
			this.inst.angle = (this.wallMode * cr.to_radians(90)) + this.originalga - cr.to_radians(90);
			
		}
		
		//TODO: IF SET ANGLE
		if (false) {
			
			var oldWallMode = ((this.ga - this.originalga)/Math.PI*2);
			var intervals = this.wallMode - oldWallMode;
			
			//Make sure oldWallMode stays clamped
			if (intervals < 0) {
				intervals += 4;
			}
			else if (intervals > 3) {
				intervals -= 4;
			}
			
			switch (intervals) {
				
				//Rotating 90 degrees
				case 1: {
					
					var oldblx = this.getCornerCoord(false, true);
					var oldbly = this.getCornerCoord(false, false);
					
					
					//this.inst.angle += cr.to_radians(90);
					this.inst.angle = (this.wallMode * cr.to_radians(90)) + this.originalga - cr.to_radians(90);
					
					this.inst.set_bbox_changed();
					this.inst.update_bbox();

					this.brx = this.getCornerCoord(true, true);
					this.bry = this.getCornerCoord(true, false);
					
					var offsetx = oldblx - this.brx;
					var offsety = oldbly - this.bry;
					
					this.inst.x += offsetx;
					this.inst.y += offsety;
					
					this.inst.set_bbox_changed();
					this.inst.update_bbox();

					
				} break;
				
				//Rotating 180 degrees
				case 2: {
					
					//this.inst.angle += cr.to_radians(180);
					this.inst.angle = (this.wallMode * cr.to_radians(90)) + this.originalga - cr.to_radians(90);
					
					this.inst.set_bbox_changed();
					this.inst.update_bbox();

				} break;
				
				//Rotating 270 degrees
				case 3: {
					
					var oldbrx = this.getCornerCoord(true, true);
					var oldbry = this.getCornerCoord(true, false);
					
					
					
					//this.inst.angle += cr.to_radians(270);
					this.inst.angle = (this.wallMode * cr.to_radians(90)) + this.originalga - cr.to_radians(90);
					
					this.inst.set_bbox_changed();
					this.inst.update_bbox();

					
					this.blx = this.getCornerCoord(false, true);
					this.bly = this.getCornerCoord(false, false);
					
					var offsetx = oldbrx - this.blx;
					var offsety = oldbry - this.bly;
					
					this.inst.x += offsetx;
					this.inst.y += offsety;
					
					this.inst.set_bbox_changed();
					this.inst.update_bbox();

					
				} break;
				
			}
		}
		
		//ga is no longer directly modified by events. Instead, originalga is, and it and wallmode are used to determine ga and directional vectors.
		this.ga = this.originalga + this.wallMode*Math.PI/2;
		
		// down vector
		this.downx = Math.cos(this.ga);
		this.downy = Math.sin(this.ga);
		
		// right vector
		this.rightx = Math.cos(this.ga - Math.PI / 2);
		this.righty = Math.sin(this.ga - Math.PI / 2);
		
		// get rid of any sin/cos small errors
		this.downx = cr.round6dp(this.downx);
		this.downy = cr.round6dp(this.downy);
		this.rightx = cr.round6dp(this.rightx);
		this.righty = cr.round6dp(this.righty);
		
		this.g1 = this.g;
		
		// gravity is negative (up): flip the down vector and make gravity positive
		// (i.e. change the angle of gravity instead)
		if (this.g < 0)
		{
			this.downx *= -1;
			this.downy *= -1;
			this.g = Math.abs(this.g);
		}
	};

	behinstProto.onCreate = function()
	{
		// Load properties
		this.softmax = this.properties[0];
		this.maxspeed = this.properties[1];
		this.acc = this.properties[2];
		this.frc = this.properties[3];
		this.dec = this.properties[4];
		this.airacc = this.properties[5];
		this.airfrc = this.properties[6];
		this.airdec = this.properties[7];
		this.airsoftmax = this.properties[8];
		this.rollacc = this.properties[9];
		this.rollfrc = this.properties[10];
		this.rolldec = this.properties[11];
		this.rollsoftmax = this.properties[12];
		this.rollThreshold = this.properties[13];
		this.unrollThreshold = this.properties[14];
		this.slopeUp = this.properties[15];
		this.slopeDown = this.properties[16];
		this.slopeUpRoll = this.properties[17];
		this.slopeDownRoll = this.properties[18];
		this.wallSpeedThreshold = this.properties[19];
		this.jumpStrength = this.properties[20];
		this.minJumpStrength = this.properties[21];
		this.g = this.properties[22];
		this.g1 = this.g;
		this.maxFall = this.properties[23];
		this.enableRolling = (this.properties[24] !== 0);	// 0=disabled, 1=enabled
		this.enableRollLock = (this.properties[25] !== 0);	// 0=disabled, 1=enabled
		this.setAngle = (this.properties[26] !== 0);
		this.defaultControls = (this.properties[27] === 1);	// 0=no, 1=yes
		this.enabled = (this.properties[28] !== 0);
		
		//Added for 1.0.2:
		this.airDragRate = this.properties[29];
		this.airDragXThreshold = this.properties[30];
		this.airDragYThreshold = this.properties[31];
		this.downhillSlopeFactorThreshold = this.properties[32];
		this.uphillSlopeFactorThreshold = this.properties[33];
		this.fallingAngleThreshold = this.properties[34];
		
		//Added for Beta 1.0.3.6 (presumably Release 1.0.4):
		this.ceilingMode = this.properties[35];
		
		//Added for Beta 1.0.3.10
		this.convexAngleThreshold = this.properties[36];
		
		this.wasOnFloor = false;
		this.wasOverJumpthru = this.runtime.testOverlapJumpThru(this.inst);
		this.loadOverJumpthru = -1;
		
		// Angle of gravity
		this.originalga = cr.to_radians(90);
		this.updateGravity();
		
		var self = this;
		
		// Only bind keyboard events via jQuery if default controls are in use
		if (this.defaultControls && !this.runtime.isDomFree)
		{
			jQuery(document).keydown(function(info) {
						self.onKeyDown(info);
					});
			
			jQuery(document).keyup(function(info) {
						self.onKeyUp(info);
					});
		}
		
		// Need to know if floor object gets destroyed
		if (!this.recycled)
		{
			this.myDestroyCallback = function(inst) {
										self.onInstanceDestroyed(inst);
									};
		}
										
		this.runtime.addDestroyCallback(this.myDestroyCallback);
		
		
		this.inst.extra["isSonicPhysicsBehavior"] = true;
	};
	
	behinstProto.saveToJSON = function ()
	{
		return {
			"ii": this.ignoreInput,
			"lfx": this.lastFloorX,
			"lfy": this.lastFloorY,
			"lfo": (this.lastFloorObject ? this.lastFloorObject.uid : -1),
			"am": this.animMode,
			"en": this.enabled,
			"fall": this.fallthrough,
			"ft": this.firstTick,
			"dx": this.dx,
			"dy": this.dy,
			"ms": this.maxspeed,
			"sms": this.softmax,
			"acc": this.acc,
			"frc": this.frc,
			"dec": this.dec,
			"aacc": this.airacc,
			"afrc": this.airfrc,
			"adec": this.airdec,
			"ams": this.airsoftmax,
			"racc": this.rollacc,
			"rfrc": this.rollfrc,
			"rdec": this.rolldec,
			"rms": this.rollsoftmax,
			"rth": this.rollThreshold,
			"urth": this.unrollThreshold,
			"su": this.slopeUp,
			"sd": this.slopeDown,
			"sur": this.slopeUpRoll,
			"sdr": this.slopeDownRoll,
			"wst": this.wallSpeedThreshold,
			"js": this.jumpStrength,
			"mjs": this.minJumpStrength,
			"g": this.g,
			"g1": this.g1,
			"mf": this.maxFall,
			"wof": this.wasOnFloor,
			"woj": (this.wasOverJumpthru ? this.wasOverJumpthru.uid : -1),
			"ga": this.originalga,
			"er": this.enableRolling,
			"erl": this.enableRollLock,
			"sa": this.setAngle,
			"adr": this.airDragRate,
			"adxt": this.airDragXThreshold,
			"adyt": this.airDragYThreshold,
			"dsft": this.downhillSlopeFactorThreshold,
			"usft": this.uphillSlopeFactorThreshold,
			"fat": this.fallingAngleThreshold,
			"cm": this.ceilingMode,
			"cat": this.convexAngleThreshold
		};
	};
	
	behinstProto.loadFromJSON = function (o)
	{
		this.ignoreInput = o["ii"];
		this.lastFloorX = o["lfx"];
		this.lastFloorY = o["lfy"];
		this.loadFloorObject = o["lfo"];
		this.animMode = o["am"];
		this.enabled = o["en"];
		this.fallthrough = o["fall"];
		this.firstTick = o["ft"];
		this.dx = o["dx"];
		this.dy = o["dy"];
		this.maxspeed = o["ms"];
		this.softmax = o["sms"];
		this.acc = o["acc"];
		this.frc = o["frc"];
		this.dec = o["dec"];
		this.airacc = o["aacc"];
		this.airfrc = o["afrc"];
		this.airdec = o["adec"];
		this.airsoftmax = o["ams"];
		this.rollacc = o["racc"];
		this.rollfrc = o["rfrc"];
		this.rolldec = o["rdec"];
		this.rollsoftmax = 0["rms"];
		this.rollThreshold = ["rth"];
		this.unrollThreshold = ["urth"];
		this.slopeUp = o["su"];
		this.slopeDown = o["sd"];
		this.slopeUpRoll = o["sur"];
		this.slopeDownRoll = o["sdr"];
		this.wallSpeedThreshold = o["wst"];
		this.jumpStrength = o["js"];
		this.minJumpStrength = o["mjs"];
		this.g = o["g"];
		this.g1 = o["g1"];
		this.maxFall = o["mf"];
		this.wasOnFloor = o["wof"];
		this.loadOverJumpthru = o["woj"];
		this.originalga = o["ga"];
		this.enablerolling = o["er"];
		this.enableRollLock = o["erl"];
		this.setAngle = o["sa"];
		this.airDragRate = o["adr"];
		this.airDragXThreshold = o["adxt"];
		this.airDragYThreshold = o["adyt"];
		this.downhillSlopeFactorThreshold = o["dsft"];
		this.uphillSlopeFactorThreshold = o["usft"];
		this.fallingAngleThreshold = o["fat"];
		this.ceilingMode = o["cm"];
		this.convexAngleThreshold = o["cat"];
		
		this.leftkey = false;
		this.rightkey = false;
		this.jumpkey = false;
		this.jumped = false;
		this.simleft = false;
		this.simright = false;
		this.simjump = false;
		this.simroll = false;
		this.sustainTime = 0;
		this.updateGravity();
	};
	
	behinstProto.afterLoad = function ()
	{
		if (this.loadFloorObject === -1)
			this.lastFloorObject = null;
		else
			this.lastFloorObject = this.runtime.getObjectByUID(this.loadFloorObject);
			
		if (this.loadOverJumpthru === -1)
			this.wasOverJumpthru = null;
		else
			this.wasOverJumpthru = this.runtime.getObjectByUID(this.loadOverJumpthru);
	};
	
	behinstProto.onInstanceDestroyed = function (inst)
	{
		// Floor object being destroyed
		if (this.lastFloorObject == inst)
			this.lastFloorObject = null;
	};
	
	behinstProto.onDestroy = function ()
	{
		this.lastFloorObject = null;
		this.runtime.removeDestroyCallback(this.myDestroyCallback);
	};

	behinstProto.onKeyDown = function (info)
	{	
		switch (info.which) {
		case 38:	// up
			info.preventDefault();
			if (!this.jumpkey)
				this.triggerJump = true;
			this.jumpkey = true;
			break;
		case 37:	// left
			info.preventDefault();
			this.leftkey = true;
			break;
		case 39:	// right
			info.preventDefault();
			this.rightkey = true;
			break;
		case 40:	// down
			info.preventDefault();
			this.rollkey = true;
			break;
		}
	};

	behinstProto.onKeyUp = function (info)
	{
		switch (info.which) {
		case 38:	// up
			info.preventDefault();
			this.jumpkey = false;
			//this.jumped = false;
			break;
		case 37:	// left
			info.preventDefault();
			this.leftkey = false;
			break;
		case 39:	// right
			info.preventDefault();
			this.rightkey = false;
			break;
		case 40:	// down
			info.preventDefault();
			this.rollkey = false;
			break;
		}
	};
	
	behinstProto.getGDir = function ()
	{
		if (this.g < 0)
			return -1;
		else
			return 1;
	};
	
	//isOnFloor has been fairly significantly changed from the default to keep track of whichever floor the weight of the player is on.
	behinstProto.isOnFloor = function ()
	{
		var retOverlap = null;
		var retOverlap2 = null;
		var retPoint = null;
		var retPoint2 = null;

		var i, len, j;
		
		//Mark down old coords and move 1 pixel down (relative to angle of gravity and wall mode)
		var oldx = this.inst.x;
		var oldy = this.inst.y;
		this.inst.x += this.downx;
		this.inst.y += this.downy;

		//update the bounding box/quad
		this.inst.set_bbox_changed();
		this.inst.update_bbox();

		//Hardcoded corner coordinates. Assumes the object is rectangular and has not been rotated (without the angle of gravity rotating too)
		//Not the ideal solution by ANY means, but there aren't a lot of options and my first priority is seeing if this thing works in the first place
		this.blx = this.getCornerCoord(false, true);
		this.bly = this.getCornerCoord(false, false);
		this.brx = this.getCornerCoord(true, true);
		this.bry = this.getCornerCoord(true, false);

		//First test for overlapping solids
		retOverlap = this.runtime.testOverlapSolid(this.inst);
		
		//If no solid overlap, check for jumpthrus
		if (!retOverlap && this.fallthrough === 0)
						retOverlap2 = this.runtime.testOverlapJumpThru(this.inst, true);

		//put object back now that all collisions and coordinates are noted
		this.inst.x = oldx;
		this.inst.y = oldy;
		this.inst.set_bbox_changed();

		//If the player isn't on the floor at all, just return null now.
		if (!retOverlap && !retOverlap2) {
			
			this.lastSegment = -1;
			return null;
			
		}

		//Check for solids at coordinates
		if (retOverlap) {
			
			//Check if the solid is still colliding now that the object is one pixel up. If so, the object is stuck in a solid and there should not be a floor.
			//In which case, don't even bother going further and checking where the weight is.
			if (this.runtime.testOverlap(this.inst, retOverlap))
				return null;
			
			this.floorIsJumpthru = false;
			
			//Check at left point
			retPoint = this.getSolidAtPoint(this.blx, this.bly);
			
			//Note down the results as this.isLeftCornerColliding, using !! to turn it into a boolean
			this.isLeftCornerColliding = !!retPoint;
			//And since we ALWAYS want to know whether the right corner is a thing, check it straight away
			this.isRightCornerColliding = !!this.getSolidAtPoint(this.brx, this.bry);
			
			//If there's nothing at the left corner, repeat for the right.
			if (!retPoint) {
				
				retPoint = this.getSolidAtPoint(this.brx, this.bry);
				
			}
			
		}

		//retOverlap2 will only have a value if retOverlap is null
		if (retOverlap2 && retOverlap2.length) {
			
			//Check at the left point
			retPoint2 = this.getJumpThruAtPoint(this.blx, this.bly, true);
			
			//As above, we want to keep track of whether there's anything colliding with the corners.
			//NOTE: turns out that getJumpThruAtPoint returns an array, which won't ever be null. Turns out I forgot and wasn't checking .length. Oops.
			this.isLeftCornerColliding = !!retPoint2.length;
			this.isRightCornerColliding = !!this.getJumpThruAtPoint(this.brx, this.bry, true).length;
			
			//Simply checking whether retPoint2 is null doesn't work, as it is an array, which could be empty
			//So check its length instead
			if (!retPoint2.length) {
				
				retPoint2 = this.getJumpThruAtPoint(this.brx, this.bry, true);
				
			}
			
		}

		//If the weight is still on lastFloorObject (if lastFloorObject is null, obviously this won't be the case)
		if (this.lastFloorObject) {
			
			//Need to go through separate cases for quads and polys
			var lastPoly = this.lastFloorObject.collision_poly;
			var lastQuad = this.lastFloorObject.bquad;
			
			//TILEMAP
			//Urgh I have no idea if I'm doing this right.
			if (this.lastFloorObject.tilemap_exists) {
				
				//Do nothing yet. Broken but at least will not crash.
				var c, rc;
				
				//Need to check each of the collrect candidates
				var collrects = [];
				this.lastFloorObject.getAllCollisionRects(collrects);
				
				for (i = 0, len = collrects.length; i < len; ++i) {
					
					c = collrects[i];
					rc = c.rc;
					
					//If it has a poly
					if (c.poly) {
						
						//I have no idea whether this just works or not
						if (c.poly.contains_pt(pointx, pointy)) {
							
							return this.lastFloorObject;
							
						}
						
					}
					
				}
				
			}
			else
			{
				if (lastPoly.pts_count > 0) {
					
					if (lastPoly.contains_pt(this.blx, this.bly) || lastPoly.contains_pt(this.brx, this.bry)) {
						
						return this.lastFloorObject;
						
					}
					
				}
				else {
					
					if (lastQuad.contains_pt(this.blx, this.bly) || lastQuad.contains_pt(this.brx, this.bry)) {
						
						return this.lastFloorObject;
						
					}
					
				}
			
			}
			
		}

		//From this point we aren't on the same floor object. This also means we aren't on the same segment
		//Set lastSegment to -1, so that the findSurfaceAngle function checks through all segments
		this.lastSegment = -1;

			
		//If this isn't null, it's a valid surface to be standing on.
		if (retPoint)
			return retPoint;

		//If there's no valid corner solid point, return the solid that is being overlapped (if there is one).
		if (retOverlap)
			return retOverlap;

		//If retPoint2 isn't null, go through them and find a valid one to return (ie isn't overlapping 1 pixel up)
		//Contents basically copied from default Platform
		if (retPoint2 && retPoint2.length) {
			
			// Filter out jumpthrus it is still overlapping one pixel up
			for (i = 0, j = 0, len = retPoint2.length; i < len; i++)
			{
				retPoint2[j] = retPoint2[i];
				
				if (!this.runtime.testOverlap(this.inst, retPoint2[i]))
					j++;
			}
			
			// All jumpthrus it is only overlapping one pixel down are floor pieces/tiles.
			// Return first in list.
			if (j >= 1)
			{
				this.floorIsJumpthru = true;
				return retPoint2[0];
			}
			
		}

		//If a JumpThru at a corner hasn't been returned, look through the overlapping JumpThrus (if any) for the same criteria as above
		if (retOverlap2 && retOverlap2.length) {
			
			// Filter out jumpthrus it is still overlapping one pixel up
			for (i = 0, j = 0, len = retOverlap2.length; i < len; i++)
			{
				retOverlap2[j] = retOverlap2[i];
				
				if (!this.runtime.testOverlap(this.inst, retOverlap2[i]))
					j++;
			}
			
			// All jumpthrus it is only overlapping one pixel down are floor pieces/tiles.
			// Return first in list.
			if (j >= 1)
			{
				this.floorIsJumpthru = true;
				return retOverlap2[0];
			}
			
		}
		
		//And by now, since all possibilities have been covered (I think?), return null
		return null;

	};
	
	behinstProto.tick = function ()
	{
	};

	behinstProto.posttick = function ()
	{
		var dt = this.runtime.getDt(this.inst);
		var mx, my, obstacle, mag, allover, i, len, j, oldx, oldy;
		
		//Adding a justJumped flag because I'm not QUITE sure whether jumped would work just as well
		var justJumped = false;
		
		//And a justFallen flag
		var justFallen = false;
		
		//REMOVE LATER:
		var tempDebug = "bluh";
		this.sonicPhysicsDebugVar = "";
		
		// The "jumped" flag needs resetting whenever the jump key is not simulated for custom controls
		// This musn't conflict with default controls so make sure neither the jump key nor simulate jump is on
		/* And I'm turning it off because I need a "Jumped" flag
		if (!this.jumpkey && !this.simjump)
			this.jumped = false;
		*/
			
		var left = this.leftkey || this.simleft;
		var right = this.rightkey || this.simright;
		var jumpkey = (this.jumpkey || this.simjump);
		var jump = jumpkey && !this.jumped;
		var roll = this.rollkey || this.simroll;
		this.simleft = false;
		this.simright = false;
		this.simjump = false;
		this.simroll = false;
		
		if (!this.enabled)
			return;
		
		// Ignoring input: ignore all keys
		if (this.ignoreInput)
		{
			left = false;
			right = false;
			jumpkey = false;
			jump = false;
			roll = false;
		}
		
		/* More old jump sustain stuff
		if (!jumpkey)
			this.sustainTime = 0;
		*/
		
		var lastFloor = this.lastFloorObject;
		var floor_moved = false;
		
		// On first tick, push up out the floor with sub-pixel precision.  This resolves 1px float issues
		// with objects placed starting exactly on the floor.
		if (this.firstTick)
		{
			if (this.runtime.testOverlapSolid(this.inst) || this.runtime.testOverlapJumpThru(this.inst))
			{
				this.runtime.pushOutSolid(this.inst, -this.downx, -this.downy, 4, true);
			}
			
			this.firstTick = false;
		}
		
		// Track moving platforms
		if (lastFloor && this.dy === 0 && (lastFloor.y !== this.lastFloorY || lastFloor.x !== this.lastFloorX))
		{
			mx = (lastFloor.x - this.lastFloorX);
			my = (lastFloor.y - this.lastFloorY);
			this.inst.x += mx;
			this.inst.y += my;
			this.inst.set_bbox_changed();
			this.lastFloorX = lastFloor.x;
			this.lastFloorY = lastFloor.y;
			floor_moved = true;
			
			// Platform moved player in to a solid: push out of the solid again
			if (this.runtime.testOverlapSolid(this.inst))
			{
				this.runtime.pushOutSolid(this.inst, -mx, -my, Math.sqrt(mx * mx + my * my) * 2.5);
			}
		}
		
		// Test if on floor
		var floor_ = this.isOnFloor();
		
		// Push out nearest here to prevent moving objects crushing/trapping the player.
		// Skip this when input predicted by the multiplayer object, since it just conflicts horribly and
		// makes the player wobble all over the place.
		var collobj = this.runtime.testOverlapSolid(this.inst);
		if (collobj)
		{
			if (this.inst.extra["inputPredicted"])
			{
				this.runtime.pushOutSolid(this.inst, -this.downx, -this.downy, 10, false);
			}
			else if (this.runtime.pushOutSolidNearest(this.inst, Math.max(this.inst.width, this.inst.height) / 2))
			{
				this.runtime.registerCollision(this.inst, collobj);
			}
			// If can't push out, must be stuck, give up
			else
				return;
		}
		
		if (floor_)
		{
			
			if (this.dy > 0)
			{
				// By chance we may have fallen perfectly to 1 pixel above the floor, which might make
				// isOnFloor return true before we've had a pushOutSolid from the floor to make us sit
				// tightly on it.  So we might actually be hovering 1 pixel in the air.  To resolve this,
				// if this is the first landing issue another pushInFractional.
				if (!this.wasOnFloor)
				{
					this.runtime.pushInFractional(this.inst, -this.downx, -this.downy, floor_, 16);
					this.wasOnFloor = true;
				}
				
				var newSurfaceAngle = this.originalga-Math.PI*0.5;
				
				//this.sonicPhysicsDebugVar = "angle set inside x movement, " + this.dy + ", " + this.dx + ", ";
				
				//If we're colliding with a ceiling here we'll want to rotate wallmode to get a result for isOnFloor
				if (this.dy < 0) {
					
					this.wallMode = 2;
					this.updateGravity();
					
				}
				
				//Should be on the floor but check just in case
				var newFloorObject = this.isOnFloor();
				
				if (newFloorObject) {
					
					//Move vertically a pixel so we're overlapping it
					this.inst.x += this.downx;
					this.inst.y += this.downy;
					this.inst.set_bbox_changed();
					
					//Check the angle
					newSurfaceAngle = this.findSurfaceAngle(newFloorObject) || 0;
					
					//Move back
					this.inst.x -= this.downx;
					this.inst.y -= this.downy;
					this.inst.set_bbox_changed();
					
				}
				
				newSurfaceAngle = cr.clamp_angle(newSurfaceAngle);
				
				//Several different cases for how the angles convert. To start off with, it depends on whether we're hitting the floor or the ceiling.
				
				if (this.dy > 0) {
					
					//Hit the floor
					
					//The first case WOULD be between 22.5 and 0 degrees or 360 and 337.5, where the ground speed would be set to the x component of movement.
					//But since I've mangled it slightly differently to work with the Platform Behaviour's approach, I can skip this one.
					
					if ((newSurfaceAngle <= Math.PI * 0.25 && newSurfaceAngle > Math.PI * 0.125) || (newSurfaceAngle <= Math.PI * 1.875 && newSurfaceAngle > Math.PI * 1.75)) {
						
						//If more than 22.5 but less than 45 degrees away from flat ground, check if x velocity is greater than y
						if (Math.abs(this.dx) < this.dy) {
							
							//If so, set X speed
							this.dx = this.dy * 0.5 * Math.sin(newSurfaceAngle);
							
						}
						//If not, just leave dx as it is
						
						
					}
					
					else if ((newSurfaceAngle <= Math.PI * 0.5 && newSurfaceAngle > Math.PI * 0.25) || (newSurfaceAngle <= Math.PI * 1.75 && newSurfaceAngle > Math.PI * 1.5)) {
						
						//If more than 45 but less than 90 degrees away from flat ground, check if x velocity is greater than y
						if (Math.abs(this.dx) < this.dy) {
							
							//If so, set X speed
							this.dx = this.dy * Math.sin(newSurfaceAngle);
							
						}
						//If not, just leave dx as it is
						
					}
					
				}
				else {
					
					//Hit the ceiling
					
					if ((newSurfaceAngle <= Math.PI * 0.75 && newSurfaceAngle > Math.PI * 0.5) || (newSurfaceAngle <= Math.PI * 1.5 && newSurfaceAngle > Math.PI * 1.25)) {
						
						//The ceiling stuff doesn't care about x speed vs y speed so just set dx
						
						this.dx = this.dy * Math.sin(newSurfaceAngle);
						
					}
					//If we're not within the range, though, we'll need to set wallmode back and update gravity
					else {
						
						this.wallMode = 0;
						this.updateGravity();
						
					}
					
				}
				
				this.dy = 0;
			}

			// First landing on the floor or floor changed
			if (lastFloor != floor_)
			{
				this.lastFloorObject = floor_;
				this.lastFloorX = floor_.x;
				this.lastFloorY = floor_.y;
				this.runtime.registerCollision(this.inst, floor_);
			}
			// If the floor has moved, check for moving in to a solid
			else if (floor_moved)
			{
				collobj = this.runtime.testOverlapSolid(this.inst);
				if (collobj)
				{
					this.runtime.registerCollision(this.inst, collobj);
					
					// Push out horizontally then up
					if (mx !== 0)
					{
						if (mx > 0)
							this.runtime.pushOutSolid(this.inst, -this.rightx, -this.righty);
						else
							this.runtime.pushOutSolid(this.inst, this.rightx, this.righty);
					}

					this.runtime.pushOutSolid(this.inst, -this.downx, -this.downy);
				}
			}
		}
		
		//Placement of this is a little arbitrary, just putting it after moving platforms and things have been tracked, but before jumping is handled.
		if ((!this.rolling && roll && floor_ && Math.abs(this.dx) > this.rollThreshold) || this.rollTrigger) {
			//Set roll to true
			//Also add an "or" condition for directly triggering it
			
			this.rolling = true;
		}
		
		//And now unroll
		if ((this.rolling && floor_ && Math.abs(this.dx) < this.unrollThreshold) || this.unrollTrigger) {
			//Set roll to false
			//And add second condition for direct triggering
			
			this.rolling = false;
		}
		
		// If jumping from floor
		if (floor_ && this.triggerJump)
		{			
			// Check we can move up 1px else assume jump is blocked.
			oldx = this.inst.x;
			oldy = this.inst.y;
			this.inst.x -= this.downx;
			this.inst.y -= this.downy;
			this.inst.set_bbox_changed();
			
			if (!this.runtime.testOverlapSolid(this.inst))
			{
				// Trigger On Jump
				this.runtime.trigger(cr.behaviors.SonicPhysics.prototype.cnds.OnJump, this.inst);
				this.animMode = ANIMMODE_JUMPING;
				
				//Sonic Physics change: Jumping is now affected by angle! Which means dx needs to be set too.
				
				this.dy = -this.jumpStrength * Math.cos(this.surfaceAngle) + Math.sin(this.surfaceAngle)*this.dx;
				this.dx = this.jumpStrength * Math.sin(this.surfaceAngle) + Math.cos(this.surfaceAngle)*this.dx;
				
				var tempDebug = "js:" + (-this.jumpStrength * Math.cos(this.surfaceAngle)) + ", dx: " + Math.sin(this.surfaceAngle)*this.dx;
				
				//Also reset the surfaceAngle so that the x movement doesn't get confused with a surfaceAngle far from the gravity angle
				this.surfaceAngle = this.originalga-Math.PI*0.5;
				
				this.wallMode = 0;
				this.updateGravity();
				
				justJumped = true;
				
				
				jump = true;		// set in case is double jump
				
				//If rolling (and if the roll lock is enabled), then lock horizontal controls until we touch the ground again.
				if (this.rolling && this.enableRollLock) {
					
					//Setting it to -1 so that it will be back to normal on landing.
					this.hlockTime = -1;
					
				}
				
				// Prevent bunnyhopping: dont allow another jump until key up
				if (floor_)
					this.jumped = true;
			}
			else
				jump = false;
				
			this.inst.x = oldx;
			this.inst.y = oldy;
			this.inst.set_bbox_changed();
		}
		
		//The horizontal control stuff is a little more complicated than it needs to be for most games, I'd say, but might as well try to be accurate.
		//The rules for horizontal control lock stuff are:
		//If the player jumps while rolling (and the roll lock is enabled) then horizontal controls are disabled until they touch the ground.
		//If the player falls off a wall/ceiling (whether rolling or not) the timer is set to 0.5 seconds. When in midair, the timer is ingored and control
		//is retained, but when on land the timer is decremented and control is ignored until the timer hits 0
		//this.sonicPhysicsDebugVar = "f: " + floor_;
		if (floor_) {
			
			if (this.hlockTime > 0) {
				
				this.lockXControl = true;
				
				this.hlockTime -= dt;
				
				if (this.hlockTime < 0)
					this.hlockTime = 0;
				
			}
			else {
				
				this.lockXControl = false;
				
				if (this.hlockTime < 0 && this.dy >= 0)
					this.hlockTime = 0;
				
			}
			
		}
		else {
			
			if (this.hlockTime >= 0)
				this.lockXControl = false;
			else
				this.lockXControl = true;
			
		}
		
		if (this.lockXControl) {
			
			left = false;
			right = false;
			
		}
		
		
		// Not on floor: apply gravity
		if (!floor_)
		{
			//Removed jump sustain here
			//Replaced with different jump sustain. Generally speaking, a matter of preference, but I'm going with this one for accuracy to Sonic physics.
			//So basically, if the player has released the jump button, then check their vertical speed. If above the minimum jump speed, set it to that.
			
			if (!jumpkey && this.jumped) {
				
				if (this.dy < -this.minJumpStrength) {
					
					this.dy = -this.minJumpStrength;
					
				}
				
			}
			
			//Air drag effect - one of the most negligible, un-noticeable things in the Genesis games. Still, accuracy!
			if (this.dy < 0 && this.dy > this.airDragYThreshold) {

				if (Math.abs(this.dx) >= this.airDragXThreshold) {
					
					//The power thing here is only to make up for framerate independence, should theoretically have the same result?
					this.dx *= Math.pow(this.airDragRate, (dt*60));

				}

			}
			
			
			this.lastFloorObject = null;
			
			this.dy += this.g * dt;
			
			// Cap to max fall speed
			if (this.dy > this.maxFall)
				this.dy = this.maxFall;
			
			// Still set the jumped flag to prevent double tap bunnyhop
			/*	Commented out because this triggers the jumped flag even if walking off a cliff, which it shouldn't. Solved bunnyhopping a different way.
			if (jump)
				this.jumped = true;
			*/
		}
		
		this.wasOnFloor = !!floor_;
		
		//Before managing speed changes based on input, do stuff based on slopes
		if (floor_) {
			
			if ((this.dx < 0) == (Math.sin(this.surfaceAngle) < 0)) {
				
				//If both dx and sin(surfaceAngle) are positive/negative then we're moving downhill.
				
				if (cr.angleDiff(this.surfaceAngle, 0) > cr.to_radians(this.downhillSlopeFactorThreshold)) {
					
					if (this.rolling) {
						
						//If we're rolling, use a different property
						this.dx += this.slopeDownRoll * Math.sin(this.surfaceAngle) * dt;
						
					}
					else {
						
						//If we're not rolling, use the ground property.
						//Note: with values for normal sonic physics there's no difference between uphill and downhill slope factor but I'm treating them
						//differently just in case
						this.dx += this.slopeDown * Math.sin(this.surfaceAngle) * dt;
						
					}
				}
				
			}
			else {
				
				if (cr.angleDiff(this.surfaceAngle, 0) > this.uphillSlopeFactorThreshold) {
					
					//If the signs don't match, then we're moving uphill.
					if (this.rolling) {
						
						this.dx += this.slopeUpRoll * Math.sin(this.surfaceAngle) * dt;
						
					}
					else {
						
						this.dx += this.slopeUp * Math.sin(this.surfaceAngle) * dt;
						
					}
				}
				
			}
			
		}
		
		//Different acceleration values depending on whether or not the object is rolling, and then whether or not it is in the air
		if (!floor_) {
			
			// Apply horizontal friction when no arrow key pressed
			if (left == right)	// both up or both down
			{
				if (this.dx < 0)
				{
					this.dx += this.airfrc * dt;
					
					if (this.dx > 0)
						this.dx = 0;
				}
				else if (this.dx > 0)
				{
					this.dx -= this.airfrc * dt;
					
					if (this.dx < 0)
						this.dx = 0;
				}
			}
			
			// Apply acceleration
			if (left && !right)
			{
				//Moving in opposite direction: add deceleration
				if (this.dx > 0)
					this.dx -= this.airdec * dt;
				else if (this.dx > -this.airsoftmax) {
					
					//If under max, increase, and only then check whether it's over max
					this.dx -= this.airacc * dt;
					
					if (this.dx < -this.airsoftmax)
						this.dx = -this.airsoftmax;
				}
			}
			
			if (right && !left)
			{
				if (this.dx < 0)
					this.dx += this.airdec * dt;
				else if (this.dx < this.airsoftmax) {
					
					this.dx += this.airacc * dt;
					
					if (this.dx > this.airsoftmax)
						this.dx = this.airsoftmax;
				}
				
			}
			
			// Cap to max speed
			if (this.dx > this.maxspeed)
				this.dx = this.maxspeed;
			else if (this.dx < -this.maxspeed)
				this.dx = -this.maxspeed;
			
		}
		else {
			
			if (!this.rolling)
			{
				// Apply horizontal friction when no arrow key pressed
				if (left == right)	// both up or both down
				{
					if (this.dx < 0)
					{
						this.dx += this.frc * dt;
						
						if (this.dx > 0)
							this.dx = 0;
					}
					else if (this.dx > 0)
					{
						this.dx -= this.frc * dt;
						
						if (this.dx < 0)
							this.dx = 0;
					}
				}
				
				// Apply acceleration
				if (left && !right)
				{
					//Moving in opposite direction: add deceleration
					if (this.dx > 0)
						this.dx -= this.dec * dt;
					else if (this.dx > -this.softmax) {
						
						//If under max, increase, and only then check whether it's over max
						this.dx -= this.acc * dt;
						
						if (this.dx < -this.softmax)
							this.dx = -this.softmax;
					}
				}
				
				if (right && !left)
				{
					if (this.dx < 0)
						this.dx += this.dec * dt;
					else if (this.dx < this.softmax) {
						
						this.dx += this.acc * dt;
						
						if (this.dx > this.softmax)
							this.dx = this.softmax;
					}
					
				}
				
				// Cap to max speed
				if (this.dx > this.maxspeed)
					this.dx = this.maxspeed;
				else if (this.dx < -this.maxspeed)
					this.dx = -this.maxspeed;
				
			}
			else {
				
				// Apply horizontal friction when no arrow key pressed
				if (left == right)	// both up or both down
				{
					if (this.dx < 0)
					{
						this.dx += this.rollfrc * dt;
						
						if (this.dx > 0)
							this.dx = 0;
					}
					else if (this.dx > 0)
					{
						this.dx -= this.rollfrc * dt;
						
						if (this.dx < 0)
							this.dx = 0;
					}
				}
				
				// Apply acceleration
				if (left && !right)
				{
					//Moving in opposite direction: add deceleration
					if (this.dx > 0)
						this.dx -= this.rolldec * dt;
					else if (this.dx > -this.rollsoftmax) {
						
						//If under max, increase, and only then check whether it's over max
						this.dx -= this.rollacc * dt;
						
						if (this.dx < -this.rollsoftmax)
							this.dx = -this.rollsoftmax;
						
						this.dx += this.rollfrc * dt;
						
						if (this.dx > 0)
							this.dx = 0;
					}
				}
				
				if (right && !left)
				{
					if (this.dx < 0)
						this.dx += this.rolldec * dt;
					else if (this.dx < this.rollsoftmax) {
						
						this.dx += this.rollacc * dt;
						
						if (this.dx > this.rollsoftmax)
							this.dx = this.rollsoftmax;
						
						this.dx -= this.rollfrc * dt;
						
						if (this.dx < 0)
							this.dx = 0;
					}
					
				}
				
				// Cap to max speed
				if (this.dx > this.maxspeed)
					this.dx = this.maxspeed;
				else if (this.dx < -this.maxspeed)
					this.dx = -this.maxspeed;
				
			}
			
		}
		
		var landed = false;
		
		//Now here's a bit of an issue: The first condition used to be (this.wallMode !== 0), since that's what's meant to be checked. Wallmode wasn't being
		//set correctly, though, so it was either FORCE wallmode to be set here, check the angle instead (basically equivalent but addresses the symptoms, not
		//the cause), or trudge through the whole thing and figure out what went wrong.
		//If you're reading this, I feel like it's worth pointing out that at the time of writing this I've done basically nothing for like two months because
		//university has to take priority. I've gone with the "easy" option simply because at this stage getting something that works but has issues is better
		//than not doing anything at all.
		//So yeah, apologies.
		//Also not being consistent with how I'm treating angles for much the same reasons.
		//And also, this won't work if the angle of gravity is changed I don't think, so yeah. Needs fixing later.
		
		//If speed is below a minimum threshold, object is on a wall or ceiling, the horizontal lock is not set, and the object is moving uphill
		if ((cr.angleDiff(this.surfaceAngle, 0) > cr.to_radians(this.fallingAngleThreshold)) && Math.abs(this.dx) < this.wallSpeedThreshold) {
			
			justFallen = true;
			
			//If not on the floor, convert the Y momentum as well as the X momentum
			if ((cr.to_clamped_degrees(this.surfaceAngle) < 271 && cr.to_clamped_degrees(this.surfaceAngle) > 89)) {
				
				//And lock movement for 0.5 seconds
				this.hlockTime = 0.5;
				
				this.wallMode = 0;
				this.updateGravity();
				
				
				//Fall off the wall
				//TODO: Put Fallen Off trigger here!
				
				//transfer velocity from surfaceAngle (which isn't updated yet) and originalga - 90 degrees
				this.dy = -this.dx * Math.sin(this.surfaceAngle - this.originalga-Math.PI*0.5);
				this.dx = cr.round6dp(-this.dx * Math.cos(this.surfaceAngle - this.originalga-Math.PI*0.5));
				
					
				this.sonicPhysicsDebugVar += "dx, " + cr.round6dp(this.dx) + ", dy: " + this.dy + ", ";
				
				
			}
			else if (this.hlockTime == 0) {
				
				this.hlockTime = 0.5;
				
			}
			
		}
		
		//Now there's a very specific situation I ran into where the player could get stuck on a shorter-than-45-degree slope but be stuck in wallmode 1/3.
		//So here's a hackish solution to that. Sorry.
		if (((cr.to_clamped_degrees(this.surfaceAngle) >=315 && this.wallMode == 3)
			 || (cr.to_clamped_degrees(this.surfaceAngle) <= 45 && this.wallMode == 1))) {
			
			//Just set the wallmode to 0.
			this.wallMode = 0;
				
			this.updateGravity();
					
		}
		
		//The x movement is more complicated than it strictly needs to be but it works for now.
		//No substepping, so it can clip through thin solids, but it's good at handling slopes at high speeds
		//I'm thinking that simply checking whether a line from starting position to end position would be sufficient to deal with clipping through object.
		//Failing that, a check from each bounding quad point.
		
		if (this.dx !== 0)
		{
			//this.sonicPhysicsDebugVar = "";
			
			//Attempt X Movement
			oldx = this.inst.x;
			oldy = this.inst.y;
			
			//The following code will have the object rotate if a slope is steeper than 45 degrees, but it should only do so once. Keep track of this.
			var rotated = false;
			var direction = 0;
			
			//The X component (relative to ga) of dx. The object should move slower (horizontally) over a slope than on flat ground.
			var xcomp = this.dx * Math.abs(Math.cos(this.surfaceAngle - this.ga + Math.PI*0.5));
			
			//The majority of code is now in a loop, which will run a second time if a slope is too steep (in either direction)
			//Could be a while loop, in theory, since the code breaks after 3 iterations at most, but in case something goes wrong it's better to have broken physics
			//than an infinite loop.
			for (var i = 0; i < 3; i++) {
				
				mx = xcomp * dt * this.rightx;
				my = xcomp * dt * this.righty;
				
				// Check that the movement distance up and across is free.  Otherwise the slope is too steep to
				// climb without rotation.
				// (used to be 1px up and across but that needed to be changed)
				this.inst.x += this.rightx * xcomp * dt - this.downx * Math.abs(xcomp) * dt;
				this.inst.y += this.righty * xcomp * dt - this.downy * Math.abs(xcomp) * dt;
				this.inst.set_bbox_changed();
				
				var is_jumpthru = false;
				
				var slope_too_steep = this.runtime.testOverlapSolid(this.inst);
				
				//Commented out code from Platform behaviour that I'm leaving here just in case
				//pretty sure it's making sure that slope_too_steep accounts for jumpthrus too, like the obstacle code below, but dunno why it's commented out
				/*
				if (!slope_too_steep && floor_)
				{
					slope_too_steep = this.runtime.testOverlapJumpThru(this.inst);
					is_jumpthru = true;
					
					// Check not also overlapping jumpthru from original position, in which
					// case ignore it as a bit of background.
					if (slope_too_steep)
					{
						this.inst.x = oldx;
						this.inst.y = oldy;
						this.inst.set_bbox_changed();
						
						if (this.runtime.testOverlap(this.inst, slope_too_steep))
						{
							slope_too_steep = null;
							is_jumpthru = false;
						}
					}
				}
				*/
				
				// Move back and move the real amount
				this.inst.x = oldx + mx;
				this.inst.y = oldy + my;
				this.inst.set_bbox_changed();
				
				// Test for overlap to side.
				obstacle = this.runtime.testOverlapSolid(this.inst);
				
				//This'll hold on to a jumpthru instance if we're already overlapping it
				var oldJumpthru = null;

				//If there's no solid obstacle, check for a jumpthru one
				if (!obstacle && floor_)
				{
					obstacle = this.runtime.testOverlapJumpThru(this.inst);
					
					// Check not also overlapping jumpthru from original position, in which
					// case ignore it as a bit of background.
					if (obstacle)
					{
						this.inst.x = oldx;
						this.inst.y = oldy;
						this.inst.set_bbox_changed();
						
						if (this.runtime.testOverlap(this.inst, obstacle))
						{
							oldJumpthru = obstacle;
							obstacle = null;
							is_jumpthru = false;
						}
						else {
							
							//Further checks: If we're still overlapping a jumpthru if we move upwards, we also want to disregard it.
							this.inst.x = oldx + this.rightx * xcomp * dt - this.downx * Math.abs(xcomp) * dt;
							this.inst.y = oldy + this.righty * xcomp * dt - this.downy * Math.abs(xcomp) * dt;
							this.inst.set_bbox_changed();
							
							if (this.runtime.testOverlapJumpThru(this.inst)) {
								
								//If we're still overlapping it, it's too steep. We'll generally want to ignore this, but not if we were previously standing on
								//this object.
								if (this.lastFloorObject == obstacle) {
									
									//If we WERE standing on this previously, then we're possibly running up a halfpipe, and should evaluate as normal.
									is_jumpthru = true;
									
								}
								//Otherwise, we want to ignore this one
								else {
									oldJumpthru = obstacle;
									obstacle = null;
									is_jumpthru = false;
								}
								
							}
							//If we're not overlapping it after moving upwards, it might be a short slope and should be evaluated normally.
							else
								is_jumpthru = true;
							
						}
						
						this.inst.x = oldx + mx;
						this.inst.y = oldy + my;
						this.inst.set_bbox_changed();
					}
					
					
				}
				
				
				if (obstacle) {
					
					// First try pushing out up the same distance that was moved horizontally.
					// If this works it's an acceptable slope, with no rotation required.
					
					var push_dist = Math.abs(xcomp * dt) + 2;
					
					//If the slope is too steep or the push failed, then it could either be a wall or a steeper than 45 degree slope
					if (slope_too_steep || !this.runtime.pushOutSolid(this.inst, -this.downx, -this.downy, push_dist, is_jumpthru, obstacle)){
						
						//If we haven't yet tried rotating, we'll probably want to try doing so
						if (!rotated) {
							
							//But first, check a couple of things.
							//First, make sure we're not on the floor, and check whether we're in Stop, Push, or Cling mode regarding ceilings.
							if (!floor_ && (this.ceilingMode == 1 || this.ceilingMode == 2)) {
								
								//Specifically, we want to see if we're not overlapping anything anymore if we move downwards, which would suggest that
								//we've run into a downward-sloping ceiling
								this.inst.x = oldx + this.rightx * xcomp * dt + this.downx * push_dist;
								this.inst.y = oldy + this.righty * xcomp * dt + this.downy * push_dist;
								this.inst.set_bbox_changed();
								
								//Conveniently, we can't possibly run into a jumpthru ceiling, because that's not how those work, so we can just check for
								//solids here.
								var stillOverlapping = this.runtime.testOverlapSolid(this.inst);
								
								//Make sure to set our position back
								this.inst.x = oldx + mx;
								this.inst.y = oldy + my;
								this.inst.set_bbox_changed();
								
								if (!stillOverlapping) {
									
									//So if, after pushing ourselves down, we're not overlapping anything anymore, then it can't be a solid wall and it
									//certainly can't be an upwards slope
									//So depending on what our mode is, we should behave differently
									
									//For either one, though, we'll want to start by pushing out downwards
									this.runtime.pushOutSolid(this.inst, this.downx, this.downy, push_dist, false);
									
									//Note: The above push out will only work for angles that are <45 degrees away from 180
									//Conveniently, this is also the range in which clinging will work
									
									//If we're in Push mode, we'll more accurately mimic the Classic games, and only push out downwards
									//For shallow angles, this will be sufficient, and we'll let it roll past the Cling mode check and break.
									//For steeper angles, this won't do, and that's handled further down
									//Long and short of it is that this chunk of code doesn't handle Push stuff
										
									//It does, however, handle Cling mode
									if (this.ceilingMode == 2) {
										
										//If we're here we want to check the ceiling angle
										this.inst.x -= this.downx;
										this.inst.y -= this.downy;
										this.inst.set_bbox_changed();
										
										var ceilingAngle = cr.clamp_angle(this.findSurfaceAngle(this.runtime.testOverlapSolid(this.inst)));
										
										//Move back down
										this.inst.x += this.downx;
										this.inst.y += this.downy;
										this.inst.set_bbox_changed();
										
										//And validate the angle
										if (ceilingAngle > 0.75*Math.PI && ceilingAngle < 1.25*Math.PI && ceilingAngle != Math.PI) {
											
											//Then, as long as we're moving at the correct speed, we can grip to the ceiling.
											if (Math.abs(this.dx) > this.wallSpeedThreshold) {
												
												//set wallmode to 2, reverse the X speed, and negate Y speed
												this.wallMode = 2;
												this.dx *= -1;
												this.dy = 0;
												
												this.updateGravity();
												
											}
											
										}
										
									}
								
									//This is terrible but I just don't want to bother re-numbering all my other breaks
									this.sonicPhysicsDebugVar += "break 0a, ";
									
									//And then break
									break;
									
								}
								//If, after pushing downwards, we're still overlapping, then it's either a horizontal wall or a steep slope
								else {
									
									//If we aren't in Push mode we'll want to ignore it, as we're basically guaranteed to be beyond the angle threshold
									//for Cling mode.
									if (this.ceilingMode == 1) {
										
										//For either one, though, we'll want to start by pushing out downwards
										var pushOutSucceeded = this.runtime.pushOutSolid(this.inst, this.downx, this.downy, push_dist*2, false);
									
										//If the push out succeeds, then it may well be just an extra-steep ceiling slope
										if (pushOutSucceeded) {
											
											//So move one pixel up and check the angle
											this.inst.x -= this.downx;
											this.inst.y -= this.downy;
											this.inst.set_bbox_changed();
											
											var ceilingAngle = cr.clamp_angle(this.findSurfaceAngle(this.runtime.testOverlapSolid(this.inst)));
											
											//Move back down
											this.inst.x += this.downx;
											this.inst.y += this.downy;
											this.inst.set_bbox_changed();
											
											//And validate the angle
											if ((ceilingAngle > 0.5*Math.PI && ceilingAngle < 0.75*Math.PI) 
											    || (ceilingAngle < 1.25*Math.PI && ceilingAngle > 1.5*Math.PI)) {
												
												//If it's within either of these ranges, we're fine!
												//We'll just want to break here and continue onwards
												this.sonicPhysicsDebugVar += "break 0b, ";
									
												break;
												
											}
											//If it's NOT a valid angle, we've probably pushed down through a ceiling or something, and we'll want to move back
											this.inst.x = oldx + mx;
											this.inst.y = oldy + my;
											this.inst.set_bbox_changed();
											
											//And then we'll allow things to flow through like usual.
											
										}
										//If we ARE overlapping here, we definitely aren't on a valid surface to push down through, so we'll stop, and let it
										//flow through to the normal obstacle checks.
										
									}
									
								}
								
							}
							//If we haven't broken by this point, though (or if we're in Stop mode), just continue checking things.
							
							//Decide which way to rotate based on dx
							if (this.dx > 0) {
								
								this.wallMode--;
								
								rotated = true
								
								direction = -1;
								
							}
							
							else {
								
								this.wallMode++;
								
								rotated = true
								
								direction = 1;
								
							}
							
							this.updateGravity();
							
							this.inst.x = oldx;
							this.inst.y = oldy;
							this.inst.set_bbox_changed();
							
							this.sonicPhysicsDebugVar += "continue 1, ";
							
							continue;
							
						}
						
						//If rotated is true, we've already tried to rotate. In this case, it's not a steep slope and should be treated as a wall.
						else {
							
							if (rotated) {
								
								if (direction < 0)
									this.wallMode++;
								
								else if (direction > 0)
									this.wallMode--;
								
							}
							
							if (direction !== 0) {
								
								this.updateGravity();
								
								//Update mx/y with the new gravity
								xcomp = this.dx * Math.abs(Math.cos(this.surfaceAngle - this.ga + Math.PI*0.5));
								mx = xcomp * dt * this.rightx;
								my = xcomp * dt * this.righty;
								
								direction = 0;
							}
							
							this.inst.x = oldx + mx;
							this.inst.y = oldy + my;
							this.inst.set_bbox_changed();
								
							//Copy-pasted horizontal push code starts here
							
							// Failed to push up out of slope.  Must be a wall - push back horizontally.
							// Push either 2.5x the horizontal distance moved this tick, or at least 30px.
							this.runtime.registerCollision(this.inst, obstacle);
							push_dist = Math.max(Math.abs(this.dx * dt * 2.5), 30);
							
							// Push out of solid: push left if moving right, or push right if moving left
							if (!this.runtime.pushOutSolid(this.inst, this.rightx * (this.dx < 0 ? 1 : -1), this.righty * (this.dx < 0 ? 1 : -1), push_dist, false))
							{
								
								// Failed to push out of solid.  Restore old position.
								this.inst.x = oldx;
								this.inst.y = oldy;
								this.inst.set_bbox_changed();
							}
							else if (floor_ && !is_jumpthru && !this.floorIsJumpthru)
							{
								// Push out wall horizontally succeeded. The player might be on a slope, in which case they might
								// now be hovering in the air slightly. So push 1px in to the floor and push out again.
								oldx = this.inst.x;
								oldy = this.inst.y;
								this.inst.x += this.downx;
								this.inst.y += this.downy;
								
								if (this.runtime.testOverlapSolid(this.inst))
								{
									if (!this.runtime.pushOutSolid(this.inst, -this.downx, -this.downy, 3, false))
									{
										// Failed to push out of solid.  Restore old position.
										this.inst.x = oldx;
										this.inst.y = oldy;
										this.inst.set_bbox_changed();
									}
								}
								else
								{
									// Not over a solid. Put it back.
									this.inst.x = oldx;
									this.inst.y = oldy;
									this.inst.set_bbox_changed();
								}
							}
							
							if (!is_jumpthru)
								this.dx = 0;	// stop
							
							//Copy-pasted horizontal push code ends here
							
							this.sonicPhysicsDebugVar += "break 1, ";
							
							//End the loop
							break;
							
						}
						
					}
					
					//Vertical push succeeded, and slope_too_steep is false.
					else {
						
						//Ordinarily, the Platform movement would leave it at that (aside from some special cases). However, it's possible that we've moved a couple
						//pixels up a steeper-than-45-degree slope, rather than actually being on a valid surface. If the slope is within 45 degrees of the current
						//surface angle, then it's valid (and special cases should be handled). If not, reset the position and treat as a wall.
						
						//Get the object we're standing on
						var newSurfaceObject = this.isOnFloor();
							
						//Move a pixel down so that there's an overlap to check the angle on
						this.inst.x += this.downx;
						this.inst.y += this.downy;
						this.inst.set_bbox_changed();
						
						var newSurfaceAngle = cr.clamp_angle(this.findSurfaceAngle(newSurfaceObject)) || 0;
						
						//this.sonicPhysicsDebugVar += "diff: " + cr.angleDiff(this.surfaceAngle, newSurfaceAngle) + ", x: " + this.inst.x + ", y: " + this.inst.y + ", ";
						
						//Move back up a pixel again
						this.inst.x -= this.downx;
						this.inst.y -= this.downy;
						this.inst.set_bbox_changed();
						
						var angleIsValid = false;
						
						/*
						//The main condition is that the surface's angle must be within 45 degrees of the current one.
						//(a little more than 45 to give a bit of leeway)
						if (this.dx > 0 && cr.angleDiff(this.surfaceAngle, newSurfaceAngle) <= Math.PI*0.26) {
							
							angleIsValid = true;
							
						}
						else if (this.dx < 0 && cr.angleDiff(this.surfaceAngle, newSurfaceAngle) <= Math.PI*0.26) {
							
							angleIsValid = true;
							
						}
						*/
						
						var diff = cr.angleDiff(this.surfaceAngle, newSurfaceAngle);
						
						var clockwise = cr.angleClockwise(newSurfaceAngle, this.surfaceAngle);
						
						var concave = (this.dx < 0 ? clockwise : !clockwise);
						
						this.sonicPhysicsDebugVar += "diff: " + diff + ", cc: " + concave + ", ";
						
						//Validation has gone through a couple iterations so it's a little messy
						//Simplest step is to check if we're at the exact same angle as before. If so, auto-valid
						if (diff == 0) {
							angleIsValid = true;
						}
						//If the angles are different, the main distinction will be whether we're working with a concave or convex change
						if (concave) {
							
							if (diff <= Math.PI*0.26) {
								
								//If the angle is less than 45 degrees away from our current one, then it's automatically considered valid, no problem.
								angleIsValid = true;
								
							}
							//If it's more than 135 degrees away, it's automatically invalid
							//It's also automatically invalid if we've rotated here from a convex slope
							//Essentially, this code should really only be running if we're on relatively flat ground.
							else if (!(diff > Math.PI*0.74) && !rotated) {
								
								//If not, we still want to check to see if the angle is in the right direction (based on the speed we're moving)
								if (this.dx < 0) {
									angleIsValid = !(newSurfaceAngle + 4*Math.PI < this.surfaceAngle + 4*Math.PI);
								}
								else {
									angleIsValid = (newSurfaceAngle + 4*Math.PI < this.surfaceAngle + 4*Math.PI);
								}
								
							}
							
						}
						//If it's not concave, though, we need to apply a different check
						else {
							
							//specifically, whether we're under the convex angle threshold
							if (diff <= cr.to_radians(this.convexAngleThreshold)) {
								angleIsValid = true;
							}
							
						}
						
						
						
						//If the angle is valid, it's a valid surface to have moved to.
						if (angleIsValid) {
							
							//Special case stuff from default Platform behaviour
							//I THINK it works here? It's a little hard to keep track, but I'm trying to make sure all the Platform behaviour's functionality is kept.
							if (!slope_too_steep && !jump && (Math.abs(this.dy) < Math.abs(this.jumpStrength / 4)))
							{
								// Must have pushed up out of slope.  Set dy to 0 to handle rare edge case when
								// jumping on to a platform from the side triggers slope detection upon landing.
								
								//At this point we're on the floor, so if we weren't before, transfer the angle before setting Y to 0
								
								if (this.dy != 0)
								{
									
									var newSurfaceAngle = this.originalga-Math.PI*0.5;
									
									//this.sonicPhysicsDebugVar = "angle set inside x movement, " + this.dy + ", " + this.dx + ", ";
									
									//If we're colliding with a ceiling here we'll want to rotate wallmode to get a result for isOnFloor
									if (this.dy < 0) {
										
										this.wallMode = 2;
										this.updateGravity();
										
									}
									
									//Should be on the floor but check just in case
									var newFloorObject = this.isOnFloor();
									
									if (newFloorObject) {
										
										//Move vertically a pixel so we're overlapping it
										this.inst.x += this.downx;
										this.inst.y += this.downy;
										this.inst.set_bbox_changed();
										
										//Check the angle
										newSurfaceAngle = this.findSurfaceAngle(newFloorObject) || 0;
										
										//Move back
										this.inst.x -= this.downx;
										this.inst.y -= this.downy;
										this.inst.set_bbox_changed();
										
									}
									
									newSurfaceAngle = cr.clamp_angle(newSurfaceAngle);
									
									//Several different cases for how the angles convert. To start off with, it depends on whether we're hitting the floor or the ceiling.
									
									if (this.dy > 0) {
										
										//Hit the floor
										
										//The first case WOULD be between 22.5 and 0 degrees or 360 and 337.5, where the ground speed would be set to the x component of movement.
										//But since I've mangled it slightly differently to work with the Platform Behaviour's approach, I can skip this one.
										
										if ((newSurfaceAngle <= Math.PI * 0.25 && newSurfaceAngle > Math.PI * 0.125) || (newSurfaceAngle <= Math.PI * 1.875 && newSurfaceAngle > Math.PI * 1.75)) {
											
											//If more than 22.5 but less than 45 degrees away from flat ground, check if x velocity is greater than y
											if (Math.abs(this.dx) < this.dy) {
												
												//If so, set X speed
												this.dx = this.dy * 0.5 * Math.sin(newSurfaceAngle);
												
											}
											//If not, just leave dx as it is
											
											
										}
										
										else if ((newSurfaceAngle <= Math.PI * 0.5 && newSurfaceAngle > Math.PI * 0.25) || (newSurfaceAngle <= Math.PI * 1.75 && newSurfaceAngle > Math.PI * 1.5)) {
											
											//If more than 45 but less than 90 degrees away from flat ground, check if x velocity is greater than y
											if (Math.abs(this.dx) < this.dy) {
												
												//If so, set X speed
												this.dx = this.dy * Math.sin(newSurfaceAngle);
												
											}
											//If not, just leave dx as it is
											
										}
										
									}
									else {
										
										//Hit the ceiling
										
										if ((newSurfaceAngle <= Math.PI * 0.75 && newSurfaceAngle > Math.PI * 0.5) || (newSurfaceAngle <= Math.PI * 1.5 && newSurfaceAngle > Math.PI * 1.25)) {
											
											//The ceiling stuff doesn't care about x speed vs y speed so just set dx
											
											this.dx = this.dy * Math.sin(newSurfaceAngle);
											
										}
										//If we're not within the range, though, we'll need to set wallmode back and update gravity
										else {
											
											this.wallMode = 0;
											this.updateGravity();
											
										}
										
									}
									
									this.dy = 0;
								}
								
								// On this rare occasion, if the player was not on the floor, they may have landed without
								// ever having been falling.  This will mean 'On landed' doesn't trigger, so trigger it now.
								if (!floor_)
									landed = true;
							}
							
							this.sonicPhysicsDebugVar += "break 2, ";
							
							break;
							
						}
						//If it's invalid, this object should be treated either as a wall (if concave) or as an edge (if not)
						else {
							
							if (concave) {
								
								//It's unlikely that the object will be rotated at this point. If something was too steep for normal movement, it's probably not out of range
								//in terms of angle AFTER rotation. Regardless, make sure we're rotated back to what we started as, since we're basically giving up here.
								if (rotated) {
									
									if (direction < 0) {
										
										this.wallMode++;
										
										direction = 0;
										
										this.updateGravity();
										
										this.sonicPhysicsDebugVar += "continue 2c, ";
										
										continue;
										
									}
									else if (direction > 0) {
										
										this.wallMode--;
										
										direction = 0;
										
										this.updateGravity();
										
										this.sonicPhysicsDebugVar += "continue 2cc, ";
										
										continue;
										
									}
									
								}
								
								//Reset mx/y, in case rotation happened
								xcomp = this.dx * Math.abs(Math.cos(this.surfaceAngle - this.ga + Math.PI*0.5));
								mx = xcomp * dt * this.rightx;
								my = xcomp * dt * this.righty;
								
								//Reset the position so we're no longer pushed out vertically
								this.inst.x = oldx + mx;
								this.inst.y = oldy + my;
								this.inst.set_bbox_changed();
								
								//Copy-pasted horizontal push code starts here
								
								// Failed to push up out of slope.  Must be a wall - push back horizontally.
								// Push either 2.5x the horizontal distance moved this tick, or at least 30px.
								this.runtime.registerCollision(this.inst, obstacle);
								push_dist = Math.max(Math.abs(this.dx * dt * 2.5), 30);
								
								// Push out of solid: push left if moving right, or push right if moving left
								if (!this.runtime.pushOutSolid(this.inst, this.rightx * (this.dx < 0 ? 1 : -1), this.righty * (this.dx < 0 ? 1 : -1), push_dist, false))
								{
									// Failed to push out of solid.  Restore old position.
									this.inst.x = oldx;
									this.inst.y = oldy;
									this.inst.set_bbox_changed();
								}
								else if (floor_ && !is_jumpthru && !this.floorIsJumpthru)
								{
									// Push out wall horizontally succeeded. The player might be on a slope, in which case they might
									// now be hovering in the air slightly. So push 1px in to the floor and push out again.
									oldx = this.inst.x;
									oldy = this.inst.y;
									this.inst.x += this.downx;
									this.inst.y += this.downy;
									
									if (this.runtime.testOverlapSolid(this.inst))
									{
										if (!this.runtime.pushOutSolid(this.inst, -this.downx, -this.downy, 3, false))
										{
											// Failed to push out of solid.  Restore old position.
											this.inst.x = oldx;
											this.inst.y = oldy;
											this.inst.set_bbox_changed();
										}
									}
									else
									{
										// Not over a solid. Put it back.
										this.inst.x = oldx;
										this.inst.y = oldy;
										this.inst.set_bbox_changed();
									}
								}
								
								if (!is_jumpthru)
									this.dx = 0;	// stop
								
								//Copy-pasted horizontal push code ends here
								
								this.sonicPhysicsDebugVar += "break 3, ";
								
								//End the loop
								break;
								
							}
							else {
								
								//If the angle is invalid, it should be treated as moving off an edge. Don't want to be rotated here, though.
								if (rotated) {
									
									if (direction < 0) {
										
										this.wallMode++;
										
										direction = 0;
										
										this.updateGravity();
										
									}
									else if (direction > 0) {
										
										this.wallMode--;
										
										direction = 0;
										
										this.updateGravity();
										
									}
									
									//At this stage, instead of setting to oldx/y + mx/y and breaking, we need to set to oldx/y and continue
								
									//Reset the position so we're no longer pushed out vertically
									this.inst.x = oldx;
									this.inst.y = oldy;
									this.inst.set_bbox_changed();
									
									this.sonicPhysicsDebugVar += "continue 2cvx, ";
									
									
									continue;
									
								}
								
								//In this case, we want the behaviour to jump off the slope, which means we need to not be on the ground
								//So we need to add some vertical movement into the mix
								
								xcomp = this.dx * Math.abs(Math.cos(this.surfaceAngle - this.ga + Math.PI*0.5));
								mx = xcomp * dt * this.rightx + 2 * dt * -this.downx;
								my = xcomp * dt * this.righty + 2 * dt * -this.downy;
								
								//Reset the position so we're no longer pushed out vertically
								this.inst.x = oldx + mx;
								this.inst.y = oldy + my;
								this.inst.set_bbox_changed();
								
								this.sonicPhysicsDebugVar += "break 3cvx, ";
								
								break;
								
							}
							
						}
						
					}
					
				}
				
				//If we're NOT overlapping an obstacle, we could either be perfectly aligned with the floor, off an edge, or off a slope. Find out which!
				else {
					
					//Check if we were on the floor but aren't anymore
					var newFloor = this.isOnFloor();
					
					this.sonicPhysicsDebugVar += "nf: " + newFloor + ", jj: " + justJumped + ", ";
					
					//Also, we shouldn't try snapping downwards if we've just jumped
					if (floor_ && !newFloor && !justJumped) {
						
						//Must be either off an edge or over a slope we should snap to.
						
						mag = Math.ceil(Math.abs(xcomp*dt)) + 2;
						
						//Normally the Platform behaviour would mark oldx/y here but I need it to be able to move from the original position at a different angle
						
						//Before we do slope checks, see if we're currently overlapping a jumpthru. If we are, we'll want to check accordingly below.
						var isOverlappingJumpthru = this.runtime.testOverlapJumpThru(this.inst);
						
						//Push ourselves into the floor so that we can check if we're on a valid slope
						this.inst.x += this.downx * mag;
						this.inst.y += this.downy * mag;
						this.inst.set_bbox_changed();
						
						//Fixing a fiddly, annoying jumpthru problem that was apparently inherited from the Platform behaviour.
						//Note: Jumpthrus are still basically going to just break if you try doing anything even remotely unusual with them.
						var overlappingSolid = this.runtime.testOverlapSolid(this.inst);
						var overlappingJumpthru = this.runtime.testOverlapJumpThru(this.inst);
						
						//If we're overlapping a jumpthru, make sure it isn't one we were overlapping previously
						if (overlappingJumpthru && this.runtime.testOverlap(this.inst, oldJumpthru)) {
							
							//If it is, we want to not push through jumpthrus
							overlappingJumpthru = null;
							
						}
						
						//If overlapping either a solid or jumpthru it'll probably be a slope, but may not be one that should be snapped to
						if (overlappingSolid || overlappingJumpthru) {
							
							this.sonicPhysicsDebugVar += "s: " + !!overlappingSolid + ", jt: " + !!overlappingJumpthru + ", ";
							
							//Push out vertically to match the slope. Not going to check its success because it's guaranteed to work unless something is VERY broken
							//Note: If we were overlapping a jumpthru before pushing ourselves into the floor, we don't want to push through jumpthrus.
							this.runtime.pushOutSolid(this.inst, -this.downx, -this.downy, mag + 2, !!overlappingJumpthru);
							
							//Angle validation:
							
							//Get the object we're standing on
							var newSurfaceObject = this.isOnFloor();
							
							//Move a pixel down so that there's an overlap to check the angle on
							this.inst.x += this.downx;
							this.inst.y += this.downy;
							this.inst.set_bbox_changed();
							
							var newSurfaceAngle = this.findSurfaceAngle(newSurfaceObject);
							
							//Move back up a pixel again
							this.inst.x -= this.downx;
							this.inst.y -= this.downy;
							this.inst.set_bbox_changed();
							
							var angleIsValid = false;
							
							//First make sure the angle isn't null. This is the only place we check for this instead of just turning null into 0.
							if (newSurfaceAngle !== null) {
								
								//Now I don't remember what the point of the dx != 0 bit is. It used to be if dx > 0 || dx < 0, or something along those lines.
								//I think I had something other than angleDiff here and whatever I was checking was dependent on which way you were going.
								//Either way I'm a little too nervous to change it right now.
								//REGARDLESS, the second part checks whether the angle is within a certain threshold of the old angle (defaults to ~40 degrees)
								if (this.dx != 0 && cr.angleDiff(this.surfaceAngle, newSurfaceAngle) <= cr.to_radians(this.convexAngleThreshold)) {
									
									angleIsValid = true;
									
								}
								
							}
							else {
								//If it is null, turn it to 0 here just in case it gets used anywhere and javascript doesn't eat the incompatibilities for me.
								newSurfaceAngle = 0;
							}
							
							if (angleIsValid) {
								
								//If the angle is valid, then mark it as the new angle and exit the loop. No special cases in downward slopes!
								
								//REMOVE LATER
								//this.surfaceAngle = newSurfaceAngle;
								
								this.sonicPhysicsDebugVar += "break 4, ";
								
								break;
								
							}
							else {
								
								//If the angle is invalid, it should be treated as moving off an edge. Don't want to be rotated here, though.
								if (rotated) {
									
									if (direction < 0) {
										
										this.wallMode++;
										
										direction = 0;
										
										this.updateGravity();
										
									}
									else if (direction > 0) {
										
										this.wallMode--;
										
										direction = 0;
										
										this.updateGravity();
										
									}
									
									//At this stage, instead of setting to oldx/y + mx/y and breaking, we need to set to oldx/y and continue
								
									//Reset the position so we're no longer pushed out vertically
									this.inst.x = oldx;
									this.inst.y = oldy;
									this.inst.set_bbox_changed();
									
									this.sonicPhysicsDebugVar += "continue 3, ";
									
									
									continue;
									
								}
								else {
									
									this.inst.x = oldx + mx;
									this.inst.y = oldy + my;
									this.inst.set_bbox_changed();
									
									this.sonicPhysicsDebugVar += "break 5, ";
									
									break;
									
								}
								
							}
							
						}
						
						//If not overlapping it's either a slope that's steeper than 45 degrees or an edge.
						else {
							
							//If we haven't yet tried rotating to match the slope (if there is one), do so, unless we've just jumped
							if (!rotated & !justJumped) {
								
								if (this.dx > 0) {
									
									this.wallMode++;
									
									rotated = true;
									
									direction = 1;
									
								}
								else {
									
									this.wallMode--;
									
									rotated = true;
									
									direction = -1;
									
								}
								
								this.updateGravity();
								
								this.inst.x = oldx;
								this.inst.y = oldy;
								this.inst.set_bbox_changed();
								
								this.sonicPhysicsDebugVar += ", mx: " + mx + ", my: " + my + ", continue 4";
								
								continue;
								
							}
							//We've already tried to rotate, so if it's still not working, give up.
							else {
									
								if (direction == 0) {
								
									//If direction is 0 and we've rotated it means we should treat this as an edge
									//But not if we've rotated BACK to here (ie, i is 2)
									//if (i !== 2) {
										
										this.inst.x = oldx + mx;
										this.inst.y = oldy + my;
										this.inst.set_bbox_changed();
										
										this.sonicPhysicsDebugVar += ", mx: " + mx + ", my: " + my + ", break 6, ";
										
										break;
										
									//}
									//Otherwise we want to rotate back again... Maybe?
									
									
								}
								else {
									
									if (direction > 0) {
																		
										this.wallMode--;
										
										direction = 0;
										
									}
									else {

										this.wallMode++;
										
										direction = 0;
										
									}
									
									this.updateGravity();

									this.inst.x = oldx;
									this.inst.y = oldy;
									this.inst.set_bbox_changed();

									this.sonicPhysicsDebugVar += "continue 5, ";

									//Continue at this point instead of breaking
									continue;
									
								}
								
							}
							
						}
						
					}
					
					else {
						
						//At this stage it's possible we've lined up nicely on a wall. We'll want to check the surface angle.
						
						//First, check if the floor object we just retrieved is even valid. If we've run sideways into a wall (and arrived here via
						//continue 1) then it likely won't be (unless we're conveniently, perfectly spaced)
						//That said, we only want to run this code if we HAVE rotated, otherwise it'll cause us to essentially be anchored to the ground
						//if we're moving at even a moderate speed
						if (!newFloor && rotated) {
							
							//If it's nonexistent, then we'll want to push ourselves downwards by a bit (as above, really) and THEN sit in the floor
							//and check our angle.
							mag = Math.ceil(Math.abs(xcomp*dt)) + 2;
						
							//Before we do slope checks, see if we're currently overlapping a jumpthru. If we are, we'll want to check accordingly below.
							var isOverlappingJumpthru = this.runtime.testOverlapJumpThru(this.inst);
							
							//Push ourselves into the floor so that we can check if we're on a valid slope
							this.inst.x += this.downx * mag;
							this.inst.y += this.downy * mag;
							this.inst.set_bbox_changed();
							
							//And if we're now overlapping, push ourselves up again
							if (this.runtime.testOverlapSolid(this.inst) || this.runtime.testOverlapJumpThru(this.inst)) {
								this.sonicPhysicsDebugVar += "nowOverlapping, ";
								this.runtime.pushOutSolid(this.inst, -this.downx, -this.downy, mag + 2, !!overlappingJumpthru);
								
								//And then re-check for the floor
								newFloor = this.isOnFloor();
							}
							else {
								//Otherwise we're probably just in midair, so put ourselves back
								this.sonicPhysicsDebugVar += "midAir, ";
								this.inst.x -= this.downx * mag;
								this.inst.y -= this.downy * mag;
								this.inst.set_bbox_changed();
							}
							
						}
						
						//Move down a pixel so we're overlapping it
						this.inst.x += this.downx;
						this.inst.y += this.downy;
						this.inst.set_bbox_changed();
						
						//Check the angle
						//somewhat important note: I eventually looked over this code again and felt it was a bad idea to be setting this.surfaceAngle
						//regardless of whether the angle was valid, and instead assigned the value to "newSurfaceAngle" instead, transferring it only
						//if valid, in the next if statement down. For some reason this caused the player to stick to walls. The lesson I've learned here
						//is to either do something properly the first time or to not stick with the same source code for more than a year.
						//Several months later:
						//I don't know HOW I accidentally fixed the issue mentioned above. In trying to fix another issue (jumpthrus suck),
						//I uncommented the "broken" code, fully expecting the player to be able to now walk up walls, but it didn't happen.
						//Fun!
						//this.surfaceAngle = this.findSurfaceAngle(newFloor) || 0;
						newSurfaceAngle = this.findSurfaceAngle(newFloor) || 0;
						
						//Move back up
						this.inst.x -= this.downx;
						this.inst.y -= this.downy;
						this.inst.set_bbox_changed();
						
						var angleIsValid = false;
						
						var diff = cr.angleDiff(this.surfaceAngle, newSurfaceAngle);
						
						var clockwise = cr.angleClockwise(newSurfaceAngle, this.surfaceAngle);
						
						var concave = (this.dx < 0 ? clockwise : !clockwise);
						
						this.sonicPhysicsDebugVar += "diff: " + diff + ", conc: " + concave + ", nsa: " + newSurfaceAngle + ", ";
						
						if (diff == 0) {
							
							angleIsValid = true;
							this.surfaceAngle = newSurfaceAngle;
							
						}
						else {
							
							if (concave) {
								
								//The main condition is that the surface's angle must be within 45 degrees of the current one.
								if (diff <= Math.PI*0.26) {
									
									angleIsValid = true;
									this.surfaceAngle = newSurfaceAngle;
									
								}
								
							}
							else {
								
								//The main condition is that the surface's angle must be within 45 degrees of the current one.
								if (diff <= cr.to_radians(this.convexAngleThreshold)) {
									
									angleIsValid = true;
									this.surfaceAngle = newSurfaceAngle;
									
								}
								
							}
							
							
						}
							
						
						if (!angleIsValid) {
							
							if (concave) {
								
								//If the angle is invalid, then if we've rotated, rotate back. I can't think of a situation where we'd be nicely over a floor
								//with an invalid angle WITHOUT rotating.
								
								if (rotated) {
									
									//I'm not putting in something for when direction is 0 because I can't think of situations where that would happen and the code
									//here is messy enough as-is.
									
									if (direction > 0) {
										
										this.wallMode--;
										
										direction = 0;
										
									}
									else if (direction < 0) {
									
										this.wallMode++;
										
										direction = 0;
										
									}
									
									this.updateGravity();
										
									this.inst.x = oldx;
									this.inst.y = oldy;
									this.inst.set_bbox_changed();
									
									this.sonicPhysicsDebugVar += "continue 6, ";
									
									continue;
									
								}
							
							}
							else {
								
								//Leave the floor slightly
								xcomp = this.dx * Math.abs(Math.cos(this.surfaceAngle - this.ga + Math.PI*0.5));
								mx = xcomp * dt * this.rightx + 2 * -this.downx;
								my = xcomp * dt * this.righty + 2 * -this.downy;
								
								this.inst.x = oldx + mx;
								this.inst.y = oldy + my;
								this.inst.set_bbox_changed();
								
								this.sonicPhysicsDebugVar += "mx: " + mx + ", my: " + my + ", ";
								
								this.sonicPhysicsDebugVar += "break 7cvx, ";
								
								break;
								
								
							}
							
						}
						
						//If we HAVEN'T just left the floor, then push into the floor fractionally (if necessary) and break the loop
						if (newFloor && this.dy === 0) {
							
							this.runtime.pushInFractional(this.inst, -this.downx, -this.downy, newFloor, 16);
							
							//this.sonicPhysicsDebugVar += "fractPush, ";
							
						}
						
						this.sonicPhysicsDebugVar += this.surfaceAngle + ", break 7, ";
						
						break;
						
					}
					
				}
			
			}
			
		}
		
		//If we've left the floor, convert velocity from the old angle to the new one
		var newFloor = this.isOnFloor();
		
		//this.sonicPhysicsDebugVar = "fl: " + floor_ + ", nf: " + newFloor + ", jJ: " + justJumped + ", jF: " + justFallen;
		
		if (floor_ && !newFloor && !justJumped && !justFallen) {
			
			//Update gravity angle here so that Y movement happens in the right direction.
			this.wallMode = 0;
			this.updateGravity();
			
			//transfer velocity from surfaceAngle (which isn't updated yet) and originalga - 90 degrees
			this.dy = -this.dx * Math.sin(this.surfaceAngle - this.originalga-Math.PI*0.5);
			this.dx = -this.dx * Math.cos(this.surfaceAngle - this.originalga-Math.PI*0.5);
			
		}
		
		if (this.dy !== 0)
		{
			// Attempt Y movement
			oldx = this.inst.x;
			oldy = this.inst.y;
			this.inst.x += this.dy * dt * this.downx;
			this.inst.y += this.dy * dt * this.downy;
			var newx = this.inst.x;
			var newy = this.inst.y;
			this.inst.set_bbox_changed();
			
			collobj = this.runtime.testOverlapSolid(this.inst);
			
			var fell_on_jumpthru = false;
			
			if (!collobj && (this.dy > 0) && !floor_)
			{
				// Get all jump-thrus currently overlapping
				allover = this.fallthrough > 0 ? null : this.runtime.testOverlapJumpThru(this.inst, true);
				
				// Filter out all objects it is not overlapping in its old position
				if (allover && allover.length)
				{
					// Special case to support vertically moving jumpthrus.
					if (this.wasOverJumpthru)
					{
						this.inst.x = oldx;
						this.inst.y = oldy;
						this.inst.set_bbox_changed();
						
						for (i = 0, j = 0, len = allover.length; i < len; i++)
						{
							allover[j] = allover[i];
							
							if (!this.runtime.testOverlap(this.inst, allover[i]))
								j++;
						}
						
						allover.length = j;
							
						this.inst.x = newx;
						this.inst.y = newy;
						this.inst.set_bbox_changed();
					}
					
					if (allover.length >= 1)
						collobj = allover[0];
				}
				
				fell_on_jumpthru = !!collobj;
			}
			
			if (collobj)
			{
				this.runtime.registerCollision(this.inst, collobj);
				
				// Push either 2.5x the vertical distance (+10px) moved this tick, or at least 30px. Don't clamp to 30px when falling on a jumpthru.
				var push_dist = (fell_on_jumpthru ? Math.abs(this.dy * dt * 2.5 + 10) : Math.max(Math.abs(this.dy * dt * 2.5 + 10), 30));
				
				// Push out of solid: push down if moving up, or push up if moving down
				if (!this.runtime.pushOutSolid(this.inst, this.downx * (this.dy < 0 ? 1 : -1), this.downy * (this.dy < 0 ? 1 : -1), push_dist, fell_on_jumpthru, collobj))
				{
					// Failed to push out of solid.  Restore old position.
					this.inst.x = oldx;
					this.inst.y = oldy;
					this.inst.set_bbox_changed();
					this.wasOnFloor = true;		// prevent adjustment for unexpected floor landings
					
					// If shearing through a jump-thru while falling, we fail the push out, but
					// want to let the player keep falling, so don't stop them.
					//Can't really convert angle here, so not much that can be done!
					if (!fell_on_jumpthru)
						this.dy = 0;	// stop
				}
				else
				{
					this.lastFloorObject = collobj;
					this.lastFloorX = collobj.x;
					this.lastFloorY = collobj.y;
					this.floorIsJumpthru = fell_on_jumpthru;
					
					// Make sure 'On landed' triggers for landing on a jumpthru
					if (fell_on_jumpthru)
						landed = true;
					
					//Instead of just setting y speed to 0 here, we get the new surface angle and convert the speed
					var newSurfaceAngle = this.originalga-Math.PI*0.5;
					
					//this.sonicPhysicsDebugVar = "angle set at end of y movement";
					
					//If we're colliding with a ceiling here we'll want to rotate wallmode to get a result for isOnFloor
					if (this.dy < 0) {
						
						this.wallMode = 2;
						this.updateGravity();
						
					}
					
					//Should be on the floor but check just in case
					var newFloorObject = this.isOnFloor();
					
					if (newFloorObject) {
						
						//Move vertically a pixel so we're overlapping it
						this.inst.x += this.downx;
						this.inst.y += this.downy;
						this.inst.set_bbox_changed();
						
						//Check the angle
						newSurfaceAngle = this.findSurfaceAngle(newFloorObject) || 0;
						
						//Move back
						this.inst.x -= this.downx;
						this.inst.y -= this.downy;
						this.inst.set_bbox_changed();
						
					}
					
					newSurfaceAngle = cr.clamp_angle(newSurfaceAngle);
					
					//Several different cases for how the angles convert. To start off with, it depends on whether we're hitting the floor or the ceiling.
					
					if (this.dy > 0) {
						
						//Hit the floor
						
						//The first case WOULD be between 22.5 and 0 degrees or 360 and 337.5, where the ground speed would be set to the x component of movement.
						//But since I've mangled it slightly differently to work with the Platform Behaviour's approach, I can skip this one.
						
						if ((newSurfaceAngle <= Math.PI * 0.25 && newSurfaceAngle > Math.PI * 0.125) || (newSurfaceAngle <= Math.PI * 1.875 && newSurfaceAngle > Math.PI * 1.75)) {
							
							//If more than 22.5 but less than 45 degrees away from flat ground, check if x velocity is greater than y
							if (Math.abs(this.dx) < this.dy) {
								
								//If so, set X speed
								this.dx = this.dy * 0.5 * Math.sin(newSurfaceAngle);
								
							}
							//If not, just leave dx as it is
							
							
						}
						
						else if ((newSurfaceAngle <= Math.PI * 0.5 && newSurfaceAngle > Math.PI * 0.25) || (newSurfaceAngle <= Math.PI * 1.75 && newSurfaceAngle > Math.PI * 1.5)) {
							
							//If more than 45 but less than 90 degrees away from flat ground, check if x velocity is greater than y
							if (Math.abs(this.dx) < this.dy) {
								
								//If so, set X speed
								this.dx = this.dy * Math.sin(newSurfaceAngle);
								
							}
							//If not, just leave dx as it is
							
						}
						
					}
					else {
						
						//Hit the ceiling
						
						if ((newSurfaceAngle <= Math.PI * 0.75 && newSurfaceAngle > Math.PI * 0.5) || (newSurfaceAngle <= Math.PI * 1.5 && newSurfaceAngle > Math.PI * 1.25)) {
							
							//The ceiling stuff doesn't care about x speed vs y speed so just set dx
							
							this.dx = this.dy * Math.sin(newSurfaceAngle);
							
						}
						//If we're not within the range, though, we'll need to set wallmode back and update gravity
						else {
							
							this.wallMode = 0;
							this.updateGravity();
							
						}
						
					}
					
					this.dy = 0;
					
				}
			}
		}
		
		justJumped = false;
		
		//Maybe move this down to below animation triggers, to actually make it one. On Fall Off Wall could be useful?
		justFallen = false;
		
		this.triggerJump = false;
		
		//Get floor object
		var newFloorObject = this.isOnFloor();
		
		if (newFloorObject) {
			
			this.jumped = false;
			
			//Move down a pixel so we're overlapping it
			this.inst.x += this.downx;
			this.inst.y += this.downy;
			this.inst.set_bbox_changed();
			
			//Check the angle
			this.surfaceAngle = this.findSurfaceAngle(newFloorObject) || 0;
			
			//Move back up
			this.inst.x -= this.downx;
			this.inst.y -= this.downy;
			this.inst.set_bbox_changed();
			
		}
		else {
			//If not on the floor, don't bother passing a null object to findSurfaceAngle and just set the angle to whatever the neutral gravity angle is
			
			this.surfaceAngle = this.originalga-Math.PI*0.5;
			
			
			//And finally, if not on the floor at the end of a tick, set the wallmode to 0.
			this.wallMode = 0;
			this.updateGravity();
			
		}
		
		//By and large this is already in the x movement section, but when moving downhill it tends to stick to angles greater than 45 degrees down.
		
		/*
		//If the surface angle is more than 45 degrees away from the gravity angle, change wallmode
		if (cr.angleDiff(this.surfaceAngle, this.ga - Math.PI*0.5) > Math.PI*0.26) {
			
			if (cr.angleClockwise(this.surfaceAngle, this.ga - Math.PI*0.5)) {
				
				this.wallMode++;
				
				this.updateGravity();
				
			}
			else {
				
				this.wallMode--;
				
				this.updateGravity();
				
			}
			
		}
		*/
		
		//If we've just landed, unroll, unless the button is down.
		//Slight issues getting it to consistently trigger on landing. Most likely my fault as the more complicated movement causes it to latch onto the ground
		//in more situations that I haven't added the landing trigger to.
		//Regardless, the second condition here seems to absolutely ensure the object doesn't stay in roll mode when it shouldn't. What I HAVEN'T done is
		//change the animation triggers, so if the "On Land" condition event doesn't trigger, that's what I'll  replace. It does a similar check with its
		//ANIMMODE_FALLING thing though so it should be good.
		if (landed || (!floor_ && newFloorObject)) {
			if (roll && Math.abs(this.dx) > this.rollThreshold) {
				this.rolling = true;
			}
			else {
				this.rolling = false;
			}
		}
		
		this.rollTrigger = false;
		this.unrollTrigger = false;
		
		//Note down the last corner. Should only happen once a tick, here. Copied-and-pasted from isOnFloor, only reason I don't have the actual corner check
		if (this.isLeftCornerColliding) {
			this.lastCorner = -1;
		}
		else if (this.isRightCornerColliding) {
			this.lastCorner = 1;
		}
		else {
			this.lastCorner = 0;
		}
		
		// Run animation triggers
		
		// Has started falling?
		if (this.animMode !== ANIMMODE_FALLING && this.dy > 0 && !floor_)
		{
			this.runtime.trigger(cr.behaviors.SonicPhysics.prototype.cnds.OnFall, this.inst);
			this.animMode = ANIMMODE_FALLING;
		}
		
		// Is on floor?
		if (floor_ || landed)
		{
			// Was falling? (i.e. has just landed) or has jumped, but jump was blocked
			if (this.animMode === ANIMMODE_FALLING || landed || (jump && this.dy === 0))
			{
				this.runtime.trigger(cr.behaviors.SonicPhysics.prototype.cnds.OnLand, this.inst);
				
				if (this.dx === 0 && this.dy === 0)
					this.animMode = ANIMMODE_STOPPED;
				else
					this.animMode = ANIMMODE_MOVING;
			}
			// Has not just landed: handle normal moving/stopped triggers
			else
			{
				if (this.animMode !== ANIMMODE_STOPPED && this.dx === 0 && this.dy === 0)
				{
					this.runtime.trigger(cr.behaviors.SonicPhysics.prototype.cnds.OnStop, this.inst);
					this.animMode = ANIMMODE_STOPPED;
				}
				
				// Has started moving and is on floor?
				if (this.animMode !== ANIMMODE_MOVING && (this.dx !== 0 || this.dy !== 0) && !jump)
				{
					this.runtime.trigger(cr.behaviors.SonicPhysics.prototype.cnds.OnMove, this.inst);
					this.animMode = ANIMMODE_MOVING;
				}
			}
		}
		
		if (this.fallthrough > 0)
			this.fallthrough--;
			
		this.wasOverJumpthru = this.runtime.testOverlapJumpThru(this.inst);
	};
	
	//Function to get the surface angle of the object being collided with. Passed object must be overlapping the player.
	//Added for SonicPhysics stuff, possibly the most important part
	//NOTE: This function can return null instead of an angle.
	behinstProto.findSurfaceAngle = function (solidObject)
	{
		
		//If either the object is null or isn't overlapping, we can't get an angle.
		if (solidObject !== null && this.runtime.testOverlap(this.inst, solidObject)) {
				
			//------------------------------------
			//Surface angle checks: Step 1, special cases
			//Essentially, since the findSurfaceAngle is a bit of a full-on process when run regularly, we want to avoid doing it as much as possible.
			//So basically, if we can rule out some situations (such as when we already know we're on flat ground) then we never have to run any collision
			//checks. The fastest code is that which is never run.
			
			//First figure out how many points on our polygon are within the solid object
			var overlappingPoints = this.getPointsOverlappingSolid(solidObject);
			var overlappingPointCount = overlappingPoints.length / 2;
			//this.sonicPhysicsDebugVar += " --POINT COUNT: " + overlappingPointCount + "--, ";
			
			//First off, if both corners of the player sprite are overlapping a solid, we return whatever a flat surface at this gravity angle is straight away. 
			//It's either a flat surface or like a little valley or something that we don't want the player getting stuck in.
			if (overlappingPointCount >= 2)
				return this.ga - Math.PI/2;
			
			//if neither is colliding, we are currently standing on a peak
			else if (overlappingPointCount == 0) {
				
				//Now, if we reached this point while landing (ie we've jumped to the top of a peak), then we want to return (relative) 0
				//The easiest way to check for this will be to see if the current surface angle is 0, as it's impossible to walk from a level, flat surface
				//to a peak wihtin a single tick
				//if (this.surfaceAngle === this.ga - Math.PI/2) {
					
					return this.ga - Math.PI/2;
					
				//}
					
				
				//Otherwise, if we reached this point while moving horizontally (where, since this is a peak, the angle MUST be something other than 0)
				//then we want to respond differently, but that will be handled below
			}
				
			//------------------------------------
			//Surface angle checks: Step 2, solid poly retrieval
			//At its simplest, a solid object will just be a Sprite. If it isn't, further steps need to be taken to figure out what kind of object it
			//actually is (particularly with tilemaps)
			//Regardless of type, we want to retrieve a polygon
			//TODO: Tidy it up a bit, and also add actual support for things that aren't Sprites
			
			//Declare the var used to hold the poly
			var solidPoly;
			//And the number of points it has (relevant for polys vs quads)
			var pointCount;
			//And finally the offset. It'll be 0 if we're using a quad, which uses absolute coords, but polys use relative coords (sometimes) and will need this.
			var solidX, solidY;
			
			//Then try to put something in it
			
			//TILEMAP
			//Just have that comment there in case something goes wrong with tilemap stuff so I know where to look. Tilemaps require a bit more effort
			//when compared to using sprites.
			if (solidObject.tilemap_exists) {
				
				//TEMPORARY
				return 0;
				
				//If it's a tilemap, we need to get all relevant tile polys and then check each to see which is currently overlapping the player.
				//Optimisation's a bit of a pain here because I can't quite just keep the last valid tile and reuse it until it's not overlapping anymore.
				//If the weight is on both corners, we can reuse it.
				
				//Now this is probably not the ideal place for this bit of code and I should probably pull it out to another method, because it's basically
				//doing what the isOnFloor method does, just for a poly instead.
				//This would be so much easier if the tilemap could return like a Tile instance to keep track of, but whatever, I can make do.
				
				//Get polys
				//Iterate through, checking each for:
				//First, poly/quad
				//Second: overlap 
				//Third: corner intersection
				
				
				//If after all iteration, we haven't found a matching tile poly, then that's a problem. I guess return 0?
				
				//Also whether or not to use offset (?????)
				
				
				
				
				
				
				//Replace all this code with something that I understand!
				/*
				var j, len2, c, rc;
				
				//Need to check each of the collrect candidates
				var collrects = [];
				solidObject.getAllCollisionRects(collrects);
				
				for (j = 0, len2 = collrects.length; j < len2; ++j) {
					
					c = collrects[j];
					rc = c.rc;
					
					//If it has a poly
					if (c.poly) {
						
						solidPoly = c.poly;
						
					}
					
				}
				*/
				
			}
			//If not a tilemap
			//NOTE: This is where I add more stuff if I need to handle other plugin types in a hardcoded way! Change to an else if. 
			//9patches may be on the todo list soon because I have a recollection of it having issues.
			else
			{
				//So it isn't a tilemap and we are overlapping it, so it's more a distinction between whether it's a quad or a poly.
				//Check if poly exists
				if (solidObject.collision_poly) {
					
					solidPoly = solidObject.collision_poly;
					
					//If poly exists, check whether it's empty (for the longest time I didn't realize this function existed and was checking (pts_count == 0))
					if (!solidPoly.is_empty()) {
						//solidPoly is a poly, just assign the point count and position
						pointCount = solidPoly.pts_count;
						solidX = solidObject.x;
						solidY = solidObject.y;
					}
					else {
						//solidPoly is a quad, so let's overwrite it with the bquad (which basically has to exist?)
						solidPoly = solidObject.bquad;
						//Can't just use pts_count, since it'll be 0 if the poly is empty. At least quads are guaranteeed to always have 4 points. I hope.
						pointCount = 4;
						solidX = 0;
						solidY = 0;
					}
					
				}
				else {
					//If poly doesn't exist this probably isn't a sprite, return null
					return null;
				}
				
			}
			
			//If solidPoly still doesn't contain anything, then it isn't a valid Sprite or Tilemap. Return null. If necessary, whatever called this will convert
			//it to 0. Either that or javascript will do it for me, because it seems hard to make it NOT do that.
			if (!solidPoly) {
				return null;
			}
			
			//And now either it has a valid poly or we've done all we can without one. Next, sort out the angle!
			
			//------------------------------------
			//Surface angle checks: Step 3, arc angle checks
			//If we're on a peak, check each segment of the overlapping solid against an arc (radius quad width) running from one corner through to below the
			//other corner. General idea is that it's used for seeing what the angle on the OTHER side of the peak is on the one tick where we've walked
			//across the top, so that when running over it we can trigger a jump
			
			//------------------------------------
			//Surface angle checks: Step 4, poly angle checks
			//Checks each segment of the overlapping solid against the player polygon
			//TODO: Change from quad checks to poly checks to allow for non-quad polygons
			
			//Get the coords of the object
			//Oddly enough, the collision poly returns point coordinates relative to origin, while the quad returns absolute coords. I think.
			//I'll admit that at the time of writing this comment I'm working off of code I worked with 3 months ago, but I think that's how it works.
			var solidX = solidObject.x;
			var solidY = solidObject.y;
			
			//Update the bounding box and grab the polygon or quad
			this.inst.update_bbox();
			
			var playerCollision = this.inst.collision_poly;
			
			
			//If the player's poly is set to the bounding box, then the poly will be empty, and so we'll want to use the quad instead
			if (playerCollision.is_empty()) {
				playerCollision = this.inst.bquad;
			}
			
			
			//Make an array to hold matching segments
			var segmentArray = [];
			//this might not be needed but some other stuff in c2's code did it. If you see this and know it's unnecessary, let me know and I'll get rid of it.
			segmentArray.length = 0;
			
			//Get all overlapping segments:
			
			//First figure out what we want to define as "overlapping" here. It's not as straightforward as just checking against the bquad, because as with
			//isOnFloor we need to take into account where the weight of the instance is resting, sometimes completely disregarding whether we're on solid
			//ground just because the weight hasn't been able to shift somewhere valid.
			
			var segmentX1, segmentX2, segmentY1, segmentY2;
			//This is just used to mark whether or not we're actually going to bother using the segment we've defined or use the bquad instead.
			var isSegmentDefined = false;
			
			//Pretty much all of this bit only needs to happen if we were on a valid point last tick.
			/*
			NOTE: Clean this up later! I believe that this isn't used in the end, but when it's time to sit down and optimise things this'll be one of the
			first things.
			if (this.lastPoint !== -1) {
				
				//For all but 1 case here we want to define the start of this segment as the origin
				segmentX1 = this.inst.x;
				segmentY1 = this.inst.y;
				//And as long as the last corner wasn't 0 we'll use a segment instead of the bquad.
				isSegmentDefined = true;
				
				//If the current last corner is overlapping (either left or right)
				if ((this.lastCorner == -1 && this.isLeftCornerColliding) || (this.lastCorner == 1 && this.isRightCornerColliding)) {
					segmentX2 = (this.lastCorner == -1 ? this.blx : this.brx);
					segmentY2 = (this.lastCorner == -1 ? this.bly : this.bry);
				}
				
				else if ((this.lastCorner == 1 && this.isLeftCornerColliding) || (this.lastCorner == -1 && this.isRightCornerColliding)) {
					//The weight of the player has shifted, so we define the opposite corner here
					segmentX2 = (this.lastCorner == 1 ? this.blx : this.brx);
					segmentY2 = (this.lastCorner == 1 ? this.bly : this.bry);
				}
				else {
					//The conditions above are a bit of a roundabout way of checking whether any of the corners are currently overlapping.
					//If none of the above have triggered, it means that we've gone from having an overlapping corner in the last tick to no overlapping corner
					//in this tick. Chances are we've walked off an edge, since if we'd jumped the function would have returned 0 or null immediately.
					//Now in order to get ramps working properly, we're ignoring the fact that we're still on the ground if there's nothing in front of us.
					//So we check downwards by the width of the object.
					
					//Define the starting point as the last corner.
					segmentX1 = (this.lastCorner == -1 ? this.blx : this.brx);
					segmentY1 = (this.lastCorner == -1 ? this.bly : this.bry);
					
					//And define the ending point as the width of the quad downwards. Multiply by down vectors to make sure it works with rotation.
					segmentX2 = (this.lastCorner == -1 ? this.bly : this.bry) + this.inst.width*this.downx;
					segmentY2 = (this.lastCorner == -1 ? this.bly : this.bry) + this.inst.width*this.downy;
					
					//If there's a solid somewhere down there it'll be found in the next section of this function.
					
				}
			
			}
			*/
			//If last corner is 0 then we don't need to do anything, isSegmentDefined is false and so the bquad will be used for checks.
			
			//Have lastSegment check here?
			
			//Special-case peak handling stuff
			if (overlappingPointCount === 0)
			{

				if (this.surfaceAngle === this.ga - Math.PI/2)
				{
					//don't run full poly check, don't actually care about that one
					//run 2 arc angle checks, from left/right
					//interpolate results based on distance from center?
					//set smoothAngle to result
					//return relative 0
				}
				else
				{
					//run arc angle check, towards "forward" (based on dx)
					//set smoothAngle to 0 (relative?)
					//return arc angle result		
				}
			}

			//get offset between that point and player sprite
			//pass through point at opposite offset to arc angle
			//pass through solid poly/quad

			//run arc checks against that poly
			//var arcSegment = this.getArcSegment(0, 90, solidPoly, this.isLeftCornerColliding, solidX, solidY);
			//TODO: Re-enable this!
			//var tempVariable = this.getOffsetAngle(true, true);
			
			//So before we can run through the segments of the poly, we need to get an array of points. Easy if it's a poly, less so if it's a bquad.
			//The differences between the two is mildly frustrating but oh well.
			
			var polyPoints = [];
			
			//Stuff for iterating through poly point arrays
			var i, len, i2, imod;
			
			//But yeah basically if we want a simple array for a quad we need to make it from scratch.
			//If the poly exists and is empty
			if (solidObject.collision_poly && solidObject.collision_poly.is_empty()) {
				
				//Go through each element.
				for (i = 0; i < 4; i++) {
					
					//It's a one-dimensional array, basically going [x1, y1, x2, y2, ... xn, yn]. This is to match up with pts_cache.
					i2 = i*2;
					
					polyPoints[i2] = solidPoly.at(i, true) - solidX;
					polyPoints[i2+1] = solidPoly.at(i, false) - solidY;
					
				}
			}
			else {
				//With a poly all we need to do is this:
				polyPoints = solidPoly.pts_cache;
			}
			//Either way polyPoints should now contain all relevant points.
			
			//NEXT: we check each segment for collisions.
			
			//More variables, to hold each poly segment
			var a1x, a1y, a2x, a2y;
			len = pointCount;
			
			for (i = 0; i < len; i++) {
						
				i2 = i*2;
				imod = ((i+1) % len)*2;
				
				a1x = polyPoints[i2] + solidX;
				a1y = polyPoints[i2+1] + solidY;
				a2x = polyPoints[imod] + solidX;
				a2y = polyPoints[imod+1] + solidY;
				
				//Check against either the segment we defined above (if we did so) or the player bquad
				
				//This check didn't quite do what I wanted. I mean it did what I told it to, that's what code does, I just didn't think it through very well.
				/*
				if ((isSegmentDefined && cr.segments_intersect(a1x, a1y, a2x, a2y, segmentX1, segmentY1, segmentX2, segmentY2)) 
				    || (!isSegmentDefined && playerCollision.intersects_segment(a1x, a1y, a2x, a2y))) 
*/
				if (playerCollision.intersects_segment(a1x, a1y, a2x, a2y)){
					
					//Since it's possible that there's more than one overlapping/intersecting segment we add its index to an array
					segmentArray.push(i);
					
				}
				
			}
			
			//The array should now contain however many overlapping segments there are. Generally either 1 or 2, not likely to be more unless you're trying to
			//intentionally break the behaviour with wierd-ass polys.
			
			//If there's more than 1 segment in the array, we need to figure out how far away they are and return the angle of the closest segment (vertically)
			//This is one of the more breakable bits of the behaviour, but if your solid objects have sensible polygons then there shouldn't be any issues.
			
			var segmentYDistance;
			//Giving it a starting value of MAX_VALUE so that any distance will be shorter than it. Not sure if there's a better way.
			var shortestYDistance = Number.MAX_VALUE;
			var closestIndex = -1;
			
			var segmentAngle;
			
			//For each segment we need to figure out the distance and angle of the points to the player's origin
			var point1Distance, point2Distance;
			var point1Angle, point2Angle;
			
			var j2, jmod;
			
			for (var i = 0; i < segmentArray.length; i++) {
							
				//Set up info about the segment
				
				var j = segmentArray[i];
				
				j2 = j*2;
				jmod = ((j+1) % len)*2;
				
				a1x = polyPoints[j2] + solidX;
				a1y = polyPoints[j2+1] + solidY;
				a2x = polyPoints[jmod] + solidX;
				a2y = polyPoints[jmod+1] + solidY;
				
				//Figure out how far the points are from the object's origin, and the angle
				point1Distance = cr.distanceTo(this.inst.x, this.inst.y, a1x, a1y);
				point2Distance = cr.distanceTo(this.inst.x, this.inst.y, a2x, a2y);
				point1Angle = cr.angleTo(this.inst.x, this.inst.y, a1x, a1y);
				point2Angle = cr.angleTo(this.inst.x, this.inst.y, a2x, a2y);
				
				//Get the vertical components of the vector (relative to the object's angle of gravity) and add them together to get the vertical distance
				segmentYDistance = Math.abs(point1Distance*Math.cos(point1Angle - this.ga) + point2Distance*Math.cos(point2Angle - this.ga));
				
				if (segmentYDistance < shortestYDistance) {
					
					shortestYDistance = segmentYDistance;
					closestIndex = j;
					segmentAngle = cr.angleTo(a1x, a1y, a2x, a2y);
					
				}
				
			}
			//And now we should have the proper segment, if one exists
			if (closestIndex !== -1) {
				
				//Mark the last segment, then FINALLY return the angle
				this.lastSegment = closestIndex;
				
				//interpolate between arc angle & normal angle to set smoothAngle
				
				return segmentAngle;
				
			}
			
			//And if things haven't been sorted out correctly by here return null because something is wrong.
			return null;
			
		} else {
			
			//No object, return null
			return null;
			
		}
	};
	
	//Gets the angle between two points beneath the player's left and right corner
	//Will give a different result to just getting the surface angle, and will be used to provide a smoother transition when wandering across terrain
	behinstProto.getOffsetAngle = function (checkLeftCorner, checkRightCorner) {
		
		this.sonicPhysicsDebugVar += "gOA, ";
		
		//If we're not to check either corner (ie both corners are overlapping ground, which means an angle of 0) then just return 0
		if (!(checkLeftCorner || checkRightCorner))
			return 0;
		
		//We want to check a segment as long as the player's width, essentially
		//though more specifically, the distance between the left/right corners (which will match the bounding box by default)
		var dist = cr.distanceTo(this.blx, this.bly, this.brx, this.bry);
		
		//the collisionPoints array will hold our final two points of contact, ie where the player is supposedly touching the ground on the left and right
		var collisionPoints = [];
		
		//the segmentsToCheck array will hold x/y coords of 1 or 2 segments extending from the bottom L/R corners of the player downwards by the player's width
		var segmentsToCheck = [];
		
		//if checkLeftCorner, add a segment from left corner downwards
		if (checkLeftCorner) {
			
			segmentsToCheck.push(this.blx);
			segmentsToCheck.push(this.bly);
            segmentsToCheck.push(this.blx + dist*this.downx);
            segmentsToCheck.push(this.bly + dist*this.downy);
            
		}
		else {
			//Otherwise, we will mark the left contact point as the bottom left corner
			collisionPoints[0] = this.blx;
			collisionPoints[1] = this.bly;
		}
		
		//and from the right if checkRightCorner
		if (checkRightCorner) {
			
			segmentsToCheck.push(this.brx);
			segmentsToCheck.push(this.bry);
            segmentsToCheck.push(this.brx + dist*this.downx);
            segmentsToCheck.push(this.bry + dist*this.downy);
            
		}
		else {
			//Otherwise, we will mark the left contact point as the bottom left corner
			collisionPoints[2] = this.brx;
			collisionPoints[3] = this.bry;
		}
		
		//We'll want to keep track of the polygons that match, and then the segments within those polygons
		var polyMatches = [];
		var segmentMatches = [];
		
		
		var solidCandidates = [];
		var jumpthruCandidates = [];
		
	
		this.inst.update_bbox();
	
		this.runtime.getSolidCollisionCandidates(this.layer, this.inst.bbox, solidCandidates);
		this.runtime.getJumpthruCollisionCandidates(this.layer, this.inst.bbox, jumpthruCandidates);
		
		var i, si, ji, len, s, j;
		
		//this.sonicPhysicsDebugVar += "segments: " + segmentsToCheck.length/4 + ", ";
		
		//So, for each segment we're checking above...
		for (i = 0; i < segmentsToCheck.length/4; i++) {
			
			//Note down the x/y coordinates of this segment
			var sx1, sy1, sx2, sy2;
			sx1 = segmentsToCheck[i*4];
			sy1 = segmentsToCheck[i*4+1];
			sx2 = segmentsToCheck[i*4+2];
			sy2 = segmentsToCheck[i*4+3];
			
			//First check all the solid candidates
			for (var si = 0, len = solidCandidates.length; si < len; ++si)
			{
			
				s = solidCandidates[si];
				
				if (!s.extra["solidEnabled"]){
					
					continue;
					
				}
				
				//TILEMAP
				//TODO: ACTUALLY ADD TILEMAP SUPPORT HERE???
				//Anything within this "if" is only for tilemap stuff. ignore for the minute
				if (s.tilemap_exists) {
				//if (false) {
					
					/*
					var k, len2, c, rc;
					
					//Need to check each of the collrect candidates
					var collrects = [];
					s.getAllCollisionRects(collrects);
					
					for (k = 0, len2 = collrects.length; k < len2; ++k) {
						
						c = collrects[j];
						rc = c.rc;
						
						//If it has a poly
						if (c.poly) {
							
							//I have no idea whether this just works or not
							if (c.poly.contains_pt(pointx, pointy)) {
								
								return s;
								
							}
							
						}
						
					}
					*/
					
				}
				else
				{
					//If we actually have a collision poly (rather than a quad)
					if (!s.collision_poly.is_empty()) {
						
						s.collision_poly.cache_poly(s.width, s.height, s.angle);
						if (s.collision_poly.intersects_segment(s.x, s.y, sx1, sy1, sx2, sy2))
						{
							//if this solid object intersects the current segment, add it to polyMatches
							polyMatches.push(s);
							
						}
						
					} 
					//If pts_count is 0, go off the bounding quad.			
					else {
						
						if (s.bquad.intersects_segment(sx1, sy1, sx2, sy2))
						{
							
							polyMatches.push(s);
							
						}
						
					}
					
				}
				
			}
			
			for (ji = 0, len = jumpthruCandidates.length; ji < len; ++ji)
			{
			
				j = jumpthruCandidates[ji];
				
				if (!j.extra["jumpthruEnabled"]){
					
					continue;
					
				}
				
				//Bounding box sprites don't have a collision polygon, so can't just check it easily.
				//Go off of collision_poly only if pts_count is larger than 0.
				if (!j.collision_poly.is_empty()) {
					
					j.collision_poly.cache_poly(j.width, j.height, j.angle);
					
					if (j.collision_poly.intersects_segment(j.x, j.y, sx1, sy1, sx2, sy2))
					{
						//if this jumpthru object intersects the current segment, we need to check that it's not a background jumpthru
						//So check if 2 pixels up from the first segment point is contained within
						if (!j.collision_poly.contains_pt(j.x + sx1 - this.downx, j.y + sy1 - this.downy)) {
							
							polyMatches.push(j);
							
						}
						
					}
					
				} 
				//If pts_count is 0, go off the bounding quad.
				else {
					
					if (j.bquad.intersects_segment(sx1, sy1, sx2, sy2))
					{
						
						polyMatches.push(j);
						
						//if this jumpthru object intersects the current segment, we need to check that it's not a background jumpthru
						//So check if 2 pixels up from the first segment point is contained within
						if (!j.bquad.contains_pt(sx1 - this.downx, sy1 - this.downy)) {
							
							polyMatches.push(j);
							
						}
						
					}
					
				}
				
			}
			
			//Now that we've checked all the collision candidates, polyMatches should contain all polygons that overlap our sensor segments
			
			//If it's empty, we can immediately return 0 (probably would only happen while we're on an edge or something)
			//Alternatively, we can be trying to reach around a greater than 45 degree angle, which just means we'll rotate around next tick
			if (polyMatches.length == 0) {
				return 0;
			}
			
			//So let's iterate through and check the segments of these polygons
			for (i = 0; i < polyMatches.length; i++) {
				
				//Grab the current poly
				var currentPoly = polyMatches[i];
				
				//And make an array to hold its points
				var polyPoints = [];
				
				//And a couple different inner loops can/will use j2 to keep track of things
				var j2;
				
				//Grab the collision data in an array
				if (currentPoly && currentPoly.is_empty()) {
					
					//Go through each element.
					for (j = 0; j < 4; j++) {
						
						//It's a one-dimensional array, basically going [x1, y1, x2, y2, ... xn, yn]. This is to match up with pts_cache.
						j2 = j*2;
						
						polyPoints[j2] = solidPoly.at(j, true) - solidX;
						polyPoints[j2+1] = solidPoly.at(j, false) - solidY;
						
					}
				}
				else {
					//With a poly all we need to do is this:
					polyPoints = solidPoly.pts_cache;
				}
				
				for (j = 0; j < polyPoints.length; j++) {
					
					j2 = j*2;
					jmod = ((j+1) % len)*2;
					
					a1x = polyPoints[j2] + solidX;
					a1y = polyPoints[j2+1] + solidY;
					a2x = polyPoints[jmod] + solidX;
					a2y = polyPoints[jmod+1] + solidY;
					
					//Check this segment against the current player sensor segment
					//Looks like I've not been entirely consistent with my naming conventions here, oops
					if (cr.segments_intersect(a1x, a1y, a2x, a2y, sx1, sy1, sx2, sy2)){
						
						//Since it's possible that there's more than one overlapping/intersecting segment we add its index to an array
						segmentMatches.push(a1x);
						segmentMatches.push(a1y);
						segmentMatches.push(a2x);
						segmentMatches.push(a2y);
						
					}
					
				}
				
			}
			
			//Finally, empty out the polyMatches and segmentMatches arrays, in case we have another iteration to go through
			polyMatches = [];
			segmentMatches = [];
			
		}
		
		solidCandidates.length = 0;
		return null;
		
		//grab all the solid collision candidates
		
		//then grab the jumpthru collision candidates
		
		//validate the jumpthru candidates to see which need to be checked
		
		//and put all the collision candidates in a single array
		
		//from there, 
		
	}
	
	//Gets a segment that we probably aren't overlapping but is in front of us (if called correctly). Used to retrieve information about the ground below
	//us even if we're not in contact with it, in order to interpolate between angles and smooth things out a bit.
	behinstProto.getArcSegment = function (startAngle, endAngle, solidCollision, originAtLeftCorner, offsetX, offsetY) {
		
		return 0;

		var nearX = (originAtLeftCorner ? this.blx : this.brx);
		var nearY = (originAtLeftCorner ? this.bly : this.bry);

		var farX = (originAtLeftCorner ? this.brx : this.blx);
		var farY = (originAtLeftCorner ? this.bry : this.bly);

		var dist = cr.distanceTo(nearX, nearY, farX, farY);

		var start = startAngle;
		var end = endAngle;
		
		//DEBUG STUFF
		
		var endX = (nearX + (Math.cos(cr.to_radians(end)) * dist));
		var endY = (nearY + (Math.sin(cr.to_radians(end)) * dist));

		this.sonicPhysicsDebugVar += "offsetX: " + offsetX + ", offsetY: " + offsetY + ", ";
		
		//Each main check we run will see if a segment we've defined from farX/Y to a point that is dist away from nearX/Y, at various angles.
		//Essentially, we're reaching from the outer corner back inwards
		//So, what we want to do FIRST is check whether we're overlapping anything at the start angle (which we shouldn't be) or if we aren't overlapping
		//anything at the end angle (which we SHOULD be). If either is true, we just return null rather than any point data.
		
		//TODO: This is also really terrible and will break if using a poly located at 0, 0 so FIX LATER
		if (offsetX === 0 && offsetY === 0) {
			//Need two different checks, one with an offset and one without.
			if (solidCollision.intersects_segment(farX, farY, (nearX + (Math.cos(cr.to_radians(start)) * dist)), (nearY + (Math.sin(cr.to_radians(start)) * dist)))
				|| !solidCollision.intersects_segment(farX, farY, (nearX + (Math.cos(cr.to_radians(end)) * dist)), (nearY + (Math.sin(cr.to_radians(end)) * dist)))) {
				return null
			}
		}
		else {
			
			if (solidCollision.intersects_segment(offsetX, offsetY, farX, farY, (nearX + (Math.cos(cr.to_radians(start)) * dist)), (nearY + (Math.sin(cr.to_radians(start)) * dist)))
				|| !solidCollision.intersects_segment(offsetX, offsetY, farX, farY, (nearX + (Math.cos(cr.to_radians(end)) * dist)), (nearY + (Math.sin(cr.to_radians(end)) * dist)))) {
				return null
			}
			
		}
		
		
		
		
		var diff = Math.abs(start - end);

		var mid = null;

		//Note: This is the threshold here, as in we're checking to 1 degree of accuracy. You've got to cut the accuracy back quite a lot before you get to
		//the point where 
		while (diff > 1) {

			mid = Math.floor((start + end) / 2);

			if (solidCollision.intersects_segment(farX, farY, (nearX + (Math.cos(cr.to_radians(mid)) * dist)), (nearY + (Math.sin(cr.to_radians(mid)) * dist)))) {
				end = mid;
			}
			else {
				start = mid;
			}
			

			diff = Math.abs(start - end);
			
		}

		//So now we've narrowed it down pretty thoroughly, hopefully to a single degree.
		this.sonicPhysicsDebugVar += "midAngle: " + mid + ", ";
	}
	
	//Get the points that are currently overlapping a solid.
	behinstProto.getPointsOverlappingSolid = function (solidObject)
	{
		//Check if the solid object exists and is overlapping the player
		if (solidObject !== null) {
			
			//Make sure our collision info is up-to-date
			this.inst.update_bbox();
			
			//Grab the polygon and quad
			var playerPoly = this.inst.collision_poly;
			//playerPoly.pts_cache;
			var playerQuad = this.inst.bquad;
			
			//Define an array to hold the points
			var polyPoints = [];
			var polyPointCount;
			
			//A couple of variables to hold the x/y locations we want to check
			var pointX, pointY;
			
			//And a couple variables to hold indices
			var i, i2;
			
			//And finally a number to track how many points are overlapping
			var overlappingPointCount = 0;
			
			//Grab all the points, either manually if we're using a bquad or via pts_cache
			if (playerPoly && playerPoly.is_empty()) {
				
				//Go through each element.
				for (i = 0; i < 4; i++) {
					
					//It's a one-dimensional array, basically going [x1, y1, x2, y2, ... xn, yn]. This is to match up with pts_cache.
					i2 = i*2;
					
					polyPoints[i2] = playerQuad.at(i, true) - this.inst.x;
					polyPoints[i2+1] = playerQuad.at(i, false) - this.inst.y;
					
				}
				polyPointCount = 4;
			}
			else {
				//With a poly all we need to do is this:
				polyPoints = playerPoly.pts_cache;
				polyPointCount = playerPoly.pts_count;
			}
			
			//Now make an array to hold all the overlapping points
			var overlappingPoints = [];
			
			//Either way we should now have a list of points, so pass through each one.
			for (i = 0; i < polyPointCount; i++) {
				
				//It's a one-dimensional array, basically going [x1, y1, x2, y2, ... xn, yn]. This is to match up with pts_cache.
				i2 = i*2;
				
				if (solidObject.collision_poly.is_empty()) {
					
					pointX = polyPoints[i2] + this.inst.x;
					pointY = polyPoints[i2+1] + this.inst.y
					
					if (solidObject.bquad.contains_pt(pointX, pointY)) {
						overlappingPointCount++;
						overlappingPoints.push(pointX);
						overlappingPoints.push(pointY);
						//this.sonicPhysicsDebugVar += "QPOINT: x: " + polyPoints[i2] + ", y: " + polyPoints[i2+1] + ", ";
					}
					
				}
				else {
					
					pointX = polyPoints[i2] + (this.inst.x - solidObject.x);
					pointY = polyPoints[i2+1] + (this.inst.y - solidObject.y);
					
					if (solidObject.collision_poly.contains_pt(pointX, pointY)) {
						overlappingPointCount++;
						overlappingPoints.push(pointX);
						overlappingPoints.push(pointY);
						//this.sonicPhysicsDebugVar += "PPOINT: x: " + pointX + ", y: " + pointY + ", ";
						//this.sonicPhysicsDebugVar += "SOLID: x: " + solidObject.x + ", y: " + solidObject.y + ", ";
					}
					
				}
				
			}
			
			return overlappingPoints;
			
		}
		//If not, return 0
		else {
			return 0;
		}
	}
	
	//The getSolidAtPoint function returns the solid object that exists at the given point, if one exists. Very similar to testOverlapSolid.
	behinstProto.getSolidAtPoint = function (pointx, pointy) 
	{
			
		var candidates = [];
		
		var i, len, s;
		
		this.inst.update_bbox();
		
		this.runtime.getSolidCollisionCandidates(this.layer, this.inst.bbox, candidates);
		
		//Go through all the Solid candidates
		for (i = 0, len = candidates.length; i < len; ++i)
		{
		
			s = candidates[i];
			
			if (!s.extra["solidEnabled"]){
				
				continue;
				
			}
			
			//TILEMAP
			//Tilemaps need to be handled differently and sort of only barely works with the current setup. Should really refactor the whole process.
			//Also this is temporarily not being as thorough as it should be, isn't taking flipping/rotating/scaling into account
			if (s.tilemap_exists) {
				
				var j, len2, c, rc;
				
				//Need to check each of the collrect candidates
				var collrects = [];
				s.getAllCollisionRects(collrects);
				
				for (j = 0, len2 = collrects.length; j < len2; ++j) {
					
					c = collrects[j];
					rc = c.rc;
					
					//If it has a poly
					if (c.poly) {
						
						//I have no idea whether this just works or not
						if (c.poly.contains_pt(pointx, pointy)) {
							
							return s;
							
						}
						
					}
					
				}
				
			}
			else
			{
				//Bounding box sprites don't have a collision polygon, so can't just check it easily.
				//Go off of collision_poly only if pts_count is larger than 0.
				if (s.collision_poly.pts_count > 0) {
					
					if (s.collision_poly.contains_pt(pointx-s.x, pointy-s.y))
					{
						//testOverlapSolid would set candidates.length to 0 here, but I'm fairly sure candidates is recreated every time the function is called.
						
						return s;
						
					}
					
				} 
				//If pts_count is 0, go off the bounding quad.			
				else {
					
					if (s.bquad.contains_pt(pointx, pointy))
					{
						
						return s;
						
					}
					
				}
				
			}
			
		}
		
		candidates.length = 0;
		return null;
		
	};
	
	//Like getSolidAtPoint but for JumpThrus. Like testOverlapJumpThru, you need to tell it whether to return the first jumpthru at the location or all of them
	//For this behaviour I'm pretty sure I only ever ask for all of them, though
	behinstProto.getJumpThruAtPoint = function (pointx, pointy, all) 
	{
		
		//Array (if all is specified) to be returned. Otherwise ends up being returned as null if nothing is found.
		var ret = null;
		
		if (all) {
			
			ret = [];
			ret.length = 0;
			
		}
		
		var candidates = [];
		
		var i, len, j;
		
		this.inst.update_bbox();
		
		this.runtime.getJumpthruCollisionCandidates(this.layer, this.inst.bbox, candidates);
		
		for (i = 0, len = candidates.length; i < len; ++i)
		{
		
			j = candidates[i];
			
			if (!j.extra["jumpthruEnabled"]){
				
				continue;
				
			}
			
			//Bounding box sprites don't have a collision polygon, so can't just check it easily.
			//Go off of collision_poly only if pts_count is larger than 0.
			if (j.collision_poly.pts_count > 0) {
				
				//Instead of testing for overlap, check if it's contained at this point
				if (j.collision_poly.contains_pt(pointx-j.x, pointy-j.y))
				{
					
					//If we're returning all the valid ones, add it to the array, otherwise just return it
					if (all)
						ret.push(j);
					else {
					
						candidates.length = 0;
						return j;
					
					}
					
				}
				
			} 
			//If pts_count is 0, go off the bounding quad.
			else {
				
				if (j.bquad.contains_pt(pointx, pointy))
				{
					
					if (all)
						ret.push(j);
					else {
					
						candidates.length = 0;
						return j;
					
					}
					
				}
				
			}
			
		}
		
		
		candidates.length = 0;
		return ret;
		
	};
	
	/**BEGIN-PREVIEWONLY**/
	var animmodes = ["stopped", "moving", "jumping", "falling"];
	behinstProto.getDebuggerValues = function (propsections)
	{
		propsections.push({
			"title": this.type.name,
			"properties": [
				{"name": "Vector X", "value": this.dx},
				{"name": "Vector Y", "value": this.dy},
				{"name": "Max speed", "value": this.maxspeed},
				{"name": "Acceleration", "value": this.acc},
				{"name": "Deceleration", "value": this.dec},
				{"name": "Jump strength", "value": this.jumpStrength},
				{"name": "Gravity", "value": this.g},
				{"name": "Gravity angle", "value": cr.to_degrees(this.ga)},
				{"name": "Max fall speed", "value": this.maxFall},
				{"name": "Animation mode", "value": animmodes[this.animMode], "readonly": true},
				{"name": "Enabled", "value": this.enabled},
				{"name": "DebugVar", "value": this.sonicPhysicsDebugVar}
			]
		});
	};
	
	behinstProto.onDebugValueEdited = function (header, name, value)
	{
		switch (name) {
		case "Vector X":					this.dx = value;					break;
		case "Vector Y":					this.dy = value;					break;
		case "Max speed":					this.maxspeed = value;				break;
		case "Acceleration":				this.acc = value;					break;
		case "Deceleration":				this.dec = value;					break;
		case "Jump strength":				this.jumpStrength = value;			break;
		case "Gravity":						this.g = value;						break;
		case "Gravity angle":				this.originalga = cr.to_radians(value);		break;
		case "Max fall speed":				this.maxFall = value;				break;
		case "Enabled":						this.enabled = value;				break;
		case "DebugVar": 					this.sonicPhysicsDebugVar = value;  break;
		}
		
		this.updateGravity();
	};
	/**END-PREVIEWONLY**/

	//////////////////////////////////////
	// Conditions
	function Cnds() {};

	Cnds.prototype.IsMoving = function ()
	{
		return this.dx !== 0 || this.dy !== 0;
	};
	
	Cnds.prototype.CompareSpeed = function (cmp, s, v)
	{
		var speed;
		
		switch (v) {
			
			case 0: {
				speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		
			} break;
			
			case 1: {
				speed = this.dx;
				
			} break;
			
			case 2: {
				speed = this.dy;
				
			} break;
			
			
		}
		
		return cr.do_cmp(speed, cmp, s);
	};
	
	Cnds.prototype.IsOnFloor = function ()
	{
		if (this.dy !== 0)
			return false;
			
		var ret = null;
		var ret2 = null;
		var i, len, j;
		
		// Move object one pixel down
		var oldx = this.inst.x;
		var oldy = this.inst.y;
		this.inst.x += this.downx;
		this.inst.y += this.downy;
		this.inst.set_bbox_changed();
		
		ret = this.runtime.testOverlapSolid(this.inst);
		
		if (!ret && this.fallthrough === 0)
			ret2 = this.runtime.testOverlapJumpThru(this.inst, true);
		
		// Put the object back
		this.inst.x = oldx;
		this.inst.y = oldy;
		this.inst.set_bbox_changed();
		
		if (ret)		// was overlapping solid
		{
			// If the object is still overlapping the solid one pixel up, it
			// must be stuck inside something.  So don't count it as floor.
			return !this.runtime.testOverlap(this.inst, ret);
		}
		
		// Is overlapping one or more jumpthrus
		if (ret2 && ret2.length)
		{
			// Filter out jumpthrus it is still overlapping one pixel up
			for (i = 0, j = 0, len = ret2.length; i < len; i++)
			{
				ret2[j] = ret2[i];
				
				if (!this.runtime.testOverlap(this.inst, ret2[i]))
					j++;
			}
			
			// All jumpthrus it is only overlapping one pixel down are floor pieces/tiles.
			// Return first in list.
			if (j >= 1)
				return true;
		}
		
		return false;
	};
	
	Cnds.prototype.IsByWall = function (side)
	{
		// Move 1px up to side and make sure not overlapping anything
		var ret = false;
		var oldx = this.inst.x;
		var oldy = this.inst.y;
		
		this.inst.x -= this.downx * 3;
		this.inst.y -= this.downy * 3;
		
		// Is overlapping solid above: must be hitting head on ceiling, don't count as wall
		this.inst.set_bbox_changed();
		if (this.runtime.testOverlapSolid(this.inst))
		{
			this.inst.x = oldx;
			this.inst.y = oldy;
			this.inst.set_bbox_changed();
			return false;
		}
		
		// otherwise move to side
		if (side === 0)		// left
		{
			this.inst.x -= this.rightx * 2;
			this.inst.y -= this.righty * 2;
		}
		else
		{
			this.inst.x += this.rightx * 2;
			this.inst.y += this.righty * 2;
		}
		
		this.inst.set_bbox_changed();
		
		// Is touching solid to side
		ret = this.runtime.testOverlapSolid(this.inst);
		
		this.inst.x = oldx;
		this.inst.y = oldy;
		this.inst.set_bbox_changed();
		
		return ret;
	};
	
	Cnds.prototype.IsJumping = function ()
	{
		return this.dy < 0;
	};
	
	Cnds.prototype.IsFalling = function ()
	{
		return this.dy > 0;
	};
	
	Cnds.prototype.OnJump = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnFall = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnStop = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnMove = function ()
	{
		return true;
	};
	
	Cnds.prototype.OnLand = function ()
	{
		return true;
	};
	
	Cnds.prototype.IsRolling = function ()
	{
		return this.rolling;
	};
	
	behaviorProto.cnds = new Cnds();

	//////////////////////////////////////
	// Actions
	function Acts() {};

	Acts.prototype.SetIgnoreInput = function (ignoring)
	{
		this.ignoreInput = ignoring;
	};
	
	Acts.prototype.SetHardMaxSpeed = function (maxspeed)
	{
		this.maxspeed = maxspeed;
		
		if (this.maxspeed < 0)
			this.maxspeed = 0;
	};
	
	Acts.prototype.SetSoftMaxSpeed = function (softmax, v)
	{
		switch (v) {
			
			case 0: {
				this.softmax = softmax;
				
				if (this.softmax < 0)
					this.softmax = 0;
			} break;
			case 1:
			{
			 	this.airsoftmax = softmax;
			 	
				if (this.airsoftmax < 0)
				this.airsoftmax = 0;
			} break;
			case 2:
			{
				this.rollsoftmax = softmax;
				
				if (this.rollsoftmax < 0)
				this.rollsoftmax = 0;
			} break;
			
		}
	};
	
	Acts.prototype.SetAcceleration = function (acc, v)
	{
		switch (v) {
			
			case 0: {
				this.acc = acc;
				
				if (this.acc < 0)
					this.acc = 0;
			} break;
			case 1:
			{
			 	this.airacc = acc;
			 	
				if (this.airacc < 0)
				this.airacc = 0;
			} break;
			case 2:
			{
				this.rollacc = acc;
				
				if (this.rollacc < 0)
				this.rollacc = 0;
			} break;
			
		}
		
	};
	
	Acts.prototype.SetDeceleration = function (dec, v)
	{
		switch (v) {
			
			case 0: {
				this.dec = dec;
				
				if (this.dec < 0)
					this.dec = 0;
			} break;
			case 1:
			{
			 	this.airdec = dec;
			 	
				if (this.airdec < 0)
				this.airdec = 0;
			} break;
			case 2:
			{
				this.rolldec = dec;
				
				if (this.rolldec < 0)
				this.rolldec = 0;
			} break;
			
		}
	};
	
	Acts.prototype.SetFriction = function (frc, v)
	{
		switch (v) {
			
			case 0: {
				this.frc = frc;
				
				if (this.frc < 0)
					this.frc = 0;
			} break;
			case 1:
			{
			 	this.airfrc = frc;
			 	
				if (this.airfrc < 0)
				this.airfrc = 0;
			} break;
			case 2:
			{
				this.rollfrc = frc;
				
				if (this.rollfrc < 0)
				this.rollfrc = 0;
			} break;
			
		}
	};
	
	Acts.prototype.SetMaxJumpStrength = function (js)
	{
		this.jumpStrength = js;
		
		if (this.jumpStrength < 0)
			this.jumpStrength = 0;
	};
	
	Acts.prototype.SetMinJumpStrength = function (js)
	{
		
		this.minJumpStrength = js;
		
		if (this.minJumpStrength < 0)
			this.minJumpStrength = 0;
		
	};
	
	Acts.prototype.SetGravity = function (grav)
	{
		if (this.g1 === grav)
			return;		// no change
		
		this.g = grav;
		this.updateGravity();
		
		// Push up to 10px out any current solid to prevent glitches
		if (this.runtime.testOverlapSolid(this.inst))
		{
			this.runtime.pushOutSolid(this.inst, this.downx, this.downy, 10);
			
			// Bodge to workaround 1px float causing pushOutSolidNearest
			this.inst.x += this.downx * 2;
			this.inst.y += this.downy * 2;
			this.inst.set_bbox_changed();
		}
		
		// Allow to fall off current floor in case direction of gravity changed
		this.lastFloorObject = null;
	};
	
	Acts.prototype.SetMaxFallSpeed = function (mfs)
	{
		this.maxFall = mfs;
		
		if (this.maxFall < 0)
			this.maxFall = 0;
	};
	
	Acts.prototype.SimulateControl = function (ctrl)
	{
		// 0=left, 1=right, 2=jump
		switch (ctrl) {
		case 0:		this.simleft = true;	break;
		case 1:		this.simright = true;	break;
		case 2:		{
			if (!this.simjump)
				this.triggerJump = true;
			this.simjump = true;
			}	break;
		case 3: 	this.simroll = true;	break;
		}
	};
	
	Acts.prototype.SetVectorX = function (vx)
	{
		this.dx = vx;
	};
	
	Acts.prototype.SetVectorY = function (vy)
	{
		this.dy = vy;
		this.jumped = false;
	};
	
	Acts.prototype.SetGravityAngle = function (a)
	{
		a = cr.to_radians(a);
		a = cr.clamp_angle(a);
		
		if (this.originalga === a)
			return;		// no change
			
		this.originalga = a;
		this.updateGravity();
		
		// Allow to fall off current floor in case direction of gravity changed
		this.lastFloorObject = null;
	};
	
	Acts.prototype.SetEnabled = function (en)
	{
		if (this.enabled !== (en === 1))
		{
			this.enabled = (en === 1);
			
			// when disabling, drop the last floor object, otherwise resets to the moving platform when enabled again
			if (!this.enabled)
				this.lastFloorObject = null;
		}
	};
	
	Acts.prototype.FallThrough = function ()
	{
		// Test is standing on jumpthru 1px down
		var oldx = this.inst.x;
		var oldy = this.inst.y;
		this.inst.x += this.downx;
		this.inst.y += this.downy;
		this.inst.set_bbox_changed();
		
		var overlaps = this.runtime.testOverlapJumpThru(this.inst, false);
		
		this.inst.x = oldx;
		this.inst.y = oldy;
		this.inst.set_bbox_changed();
		
		if (!overlaps)
			return;
			
		this.fallthrough = 3;			// disable jumpthrus for 3 ticks (1 doesn't do it, 2 does, 3 to be on safe side)
		this.lastFloorObject = null;
	};
	
	Acts.prototype.TriggerRoll = function (e)
	{
		if (e == 0)
			this.rollTrigger = true;
		else
			this.unrollTrigger = true;
	};
	
	Acts.prototype.SetSlopeFactor = function (s, v, d)
	{
		if (v == 0) {
			
			if (d == 0) {
				
				this.slopeUp = s;
				
			}
			else {
				
				this.slopeDown = s;
				
			}
			
		}
		else {
			
			if (d == 0) {
				
				this.slopeUpRoll = s;
				
			}
			else {
				
				this.slopeDownRoll = s;
				
			}
			
		}
		
	};
	
	Acts.prototype.SetAirDragRate = function (a)
	{
		this.airDragRate = a;
	};
	
	Acts.prototype.SetAirDragRate = function (t, v)
	{
		switch (v) {
			case 0:
			this.airDragXThreshold = t;
			break;
			
			case 1:
			this.airDragYThreshold = t;
			break;
		}
	};
	
	behaviorProto.acts = new Acts();

	//////////////////////////////////////
	// Expressions
	function Exps() {};

	Exps.prototype.Speed = function (ret)
	{
		ret.set_float(Math.sqrt(this.dx * this.dx + this.dy * this.dy));
	};
	
	Exps.prototype.HardMaxSpeed = function (ret)
	{
		ret.set_float(this.maxspeed);
	};
	
	Exps.prototype.Acceleration = function (ret)
	{
		ret.set_float(this.acc);
	};
	
	Exps.prototype.Deceleration = function (ret)
	{
		ret.set_float(this.dec);
	};
	
	Exps.prototype.JumpStrength = function (ret)
	{
		ret.set_float(this.jumpStrength);
	};
	
	Exps.prototype.Gravity = function (ret)
	{
		ret.set_float(this.g);
	};
	
	Exps.prototype.GravityAngle = function (ret)
	{
		ret.set_float(cr.to_degrees(this.ga));
	};
	
	Exps.prototype.MaxFallSpeed = function (ret)
	{
		ret.set_float(this.maxFall);
	};
	
	Exps.prototype.MovingAngle = function (ret)
	{
		ret.set_float(cr.to_degrees(Math.atan2(this.dy, this.dx)));
	};
	
	Exps.prototype.VectorX = function (ret)
	{
		ret.set_float(this.dx);
	};
	
	Exps.prototype.VectorY = function (ret)
	{
		ret.set_float(this.dy);
	};
	
	Exps.prototype.MinJumpStrength = function (ret)
	{
		ret.set_float(this.minJumpStrength);
	};
	
	Exps.prototype.Friction = function (ret)
	{
		ret.set_float(this.frc);
	};
	
	Exps.prototype.SoftMaxSpeed = function (ret)
	{
		ret.set_float(this.softmax);
	};
	
	Exps.prototype.AirAcceleration = function (ret)
	{
		ret.set_float(this.airacc);
	};
	
	Exps.prototype.AirFriction = function (ret)
	{
		ret.set_float(this.airfrc);
	};
	
	Exps.prototype.AirDeceleration = function (ret)
	{
		ret.set_float(this.airdec);
	};
	
	Exps.prototype.AirSoftMaxSpeed = function (ret)
	{
		ret.set_float(this.airsoftmax);
	};
	
	Exps.prototype.RollAcceleration = function (ret)
	{
		ret.set_float(this.rollacc);
	};
	
	Exps.prototype.RollFriction = function (ret)
	{
		ret.set_float(this.rollfrc);
	};
	
	Exps.prototype.RollDeceleration = function (ret)
	{
		ret.set_float(this.rolldec);
	};
	
	Exps.prototype.RollSoftMaxSpeed = function (ret)
	{
		ret.set_float(this.rollsoftmax);
	};
	
	Exps.prototype.RollThreshold = function (ret)
	{
		ret.set_float(this.rollThreshold);
	};
	
	Exps.prototype.UnrollThreshold = function (ret)
	{
		ret.set_float(this.unrollThreshold);
	};
	
	Exps.prototype.SurfaceAngle = function (ret)
	{
		ret.set_float(cr.to_clamped_degrees(this.surfaceAngle));
	};
	
	Exps.prototype.SlopeFactorUp = function (ret)
	{
		ret.set_float(this.slopeUp);
	};
	
	Exps.prototype.SlopeFactorDown = function (ret)
	{
		ret.set_float(this.slopeDown);
	};
	
	Exps.prototype.SlopeFactorUpRoll = function (ret)
	{
		ret.set_float(this.slopeUpRoll);
	};
	
	Exps.prototype.SlopeFactorDownRoll = function (ret)
	{
		ret.set_float(this.slopeDownRoll);
	};
	
	Exps.prototype.SonicPhysicsDebug = function (ret)
	{
		ret.set_any(this.sonicPhysicsDebugVar);
	};
	
	Exps.prototype.AirDragRate = function (ret)
	{
		ret.set_float(this.airDragRate);
	};
	
	Exps.prototype.AirDragXThreshold = function (ret)
	{
		ret.set_float(this.airDragXThreshold);
	};
	
	Exps.prototype.AirDragYThreshold = function (ret)
	{
		ret.set_float(this.airDragYThreshold);
	};


	
	behaviorProto.exps = new Exps();
	
}());