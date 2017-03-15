function GetBehaviorSettings()
{
	return {
		"name":			"Sonic Physics",
		"id":			"SonicPhysics",
		"version":		"0.1",
		"description":	"An extension of the Platform behaviour, designed to mimic classic Sonic the Hedgehog game movement.",
		"author":		"PixelMonkey",
		"help url":		"http://www.scirra.com/manual/100/platform",
		"category":		"Movements",
		"flags":		0
	};
};

//////////////////////////////////////////////////////////////
// Conditions
AddCondition(0, 0, "Is moving", "", "{my} is moving", "True when the object is moving.", "IsMoving");

AddCmpParam("Comparison", "Choose the way to compare the current speed.");
AddNumberParam("Speed", "The speed, in pixels per second, to compare the current speed to.");
AddComboParamOption("Both");
AddComboParamOption("Vector X");
AddComboParamOption("Vector Y");
AddComboParam("Vector", "Which vector to compare");
AddCondition(1, 0, "Compare speed", "", "{my} speed {2} {0} {1}", "Compare the current speed of the object.", "CompareSpeed");

AddCondition(2, 0, "Is on floor", "", "{my} is on floor", "True when the object is on top of a solid or platform.", "IsOnFloor");

AddCondition(3, 0, "Is jumping", "", "{my} is jumping", "True when the object is moving upwards (i.e. jumping).", "IsJumping");

AddCondition(4, 0, "Is falling", "", "{my} is falling", "True when the object is moving downwards (i.e. falling).", "IsFalling");

AddCondition(5, cf_trigger, "On jump", "Animation triggers", "{my} On jump", "Triggered when jumping.", "OnJump");
AddCondition(6, cf_trigger, "On fall", "Animation triggers", "{my} On fall", "Triggered when falling.", "OnFall");
AddCondition(7, cf_trigger, "On stopped", "Animation triggers", "{my} On stopped", "Triggered when stopped moving.", "OnStop");
AddCondition(8, cf_trigger, "On moved", "Animation triggers", "{my} On moved", "Triggered when starting to move.", "OnMove");
AddCondition(9, cf_trigger, "On landed", "Animation triggers", "{my} On landed", "Triggered when first hitting the floor.", "OnLand");

AddComboParamOption("left");
AddComboParamOption("right");
AddComboParam("Side", "Select the side to test for a wall.");
AddCondition(10, 0, "Is by wall", "", "{my} has wall to {0}", "Test if the object has a wall to the left or right.", "IsByWall");

//Note: removed the Is Double Jump Enabled condition here, and changing Is Rolling from 12 to 11 would break any projects using this condition.
//If/when I add another condition (and I probably will) I'll make it 11.
AddCondition(12, 0, "Is rolling", "", "{my} is rolling", "True if object is currently rolling.", "IsRolling");

//////////////////////////////////////////////////////////////
// Actions
AddComboParamOption("Stop ignoring");
AddComboParamOption("Start ignoring");
AddComboParam("Input", "Set whether to ignore the controls for this movement.");
AddAction(0, 0, "Set ignoring input", "", "{0} {my} user input", "Set whether to ignore the controls for this movement.", "SetIgnoreInput");

AddNumberParam("Soft Max Speed", "The new soft maximum speed of the object to set, in pixels per second.");
AddComboParamOption("Ground");
AddComboParamOption("Air");
AddComboParamOption("Rolling");
AddComboParam("Variation", "Which variation of this parameter to set");
AddAction(1, 0, "Set soft max speed", "", "Set {my} soft maximum speed to <i>{0}</i>", "Set the object's soft maximum speed.", "SetSoftMaxSpeed");

AddNumberParam("Hard Max Speed", "The new hard maximum speed of the object to set, in pixels per second.");
AddAction(2, 0, "Set hard max speed", "", "Set {my} hard maximum speed to <i>{0}</i>", "Set the object's hard maximum speed.", "SetHardMaxSpeed");

AddNumberParam("Acceleration", "The new acceleration of the object to set, in pixels per second per second.");
AddComboParamOption("Ground");
AddComboParamOption("Air");
AddComboParamOption("Rolling");
AddComboParam("Variation", "Which variation of this parameter to set");
AddAction(3, 0, "Set acceleration", "", "Set {my} acceleration to <i>{0}</i>", "Set the object's acceleration.", "SetAcceleration");

AddNumberParam("Deceleration", "The new deceleration of the object to set, in pixels per second per second.");
AddComboParamOption("Ground");
AddComboParamOption("Air");
AddComboParamOption("Rolling");
AddComboParam("Variation", "Which variation of this parameter to set");
AddAction(4, 0, "Set deceleration", "", "Set {my} deceleration to <i>{0}</i>", "Set the object's deceleration.", "SetDeceleration");

AddNumberParam("Friction", "The new friction of the object to set, in pixels per second per second.");
AddComboParamOption("Ground");
AddComboParamOption("Air");
AddComboParamOption("Rolling");
AddComboParam("Variation", "Which variation of this parameter to set");
AddAction(5, 0, "Set friction", "", "Set {my} friction to <i>{0}</i>", "Set the object's friction.", "SetFriction");

AddNumberParam("Max Jump strength", "The new speed at which jumps start, in pixels per second.");
AddAction(6, 0, "Set max jump strength", "", "Set {my} max jump strength to <i>{0}</i>", "Set the object's max jump strength.", "SetMaxJumpStrength");

AddNumberParam("Min Jump strength", "The new speed at which jumps are capped to on release, in pixels per second.");
AddAction(7, 0, "Set min jump strength", "", "Set {my} min jump strength to <i>{0}</i>", "Set the object's min jump strength.", "SetMinJumpStrength");

AddNumberParam("Gravity", "The new acceleration from gravity, in pixels per second per second.");
AddAction(8, 0, "Set gravity", "", "Set {my} gravity to <i>{0}</i>", "Set the object's gravity.", "SetGravity");

AddNumberParam("Max fall speed", "The new maximum speed object can reach in freefall, in pixels per second.");
AddAction(9, 0, "Set max fall speed", "", "Set {my} max fall speed to <i>{0}</i>", "Set the object's maximum fall speed.", "SetMaxFallSpeed");

AddComboParamOption("Left");
AddComboParamOption("Right");
AddComboParamOption("Jump");
AddComboParamOption("Roll");
AddComboParam("Control", "The movement control to simulate pressing.");
AddAction(10, 0, "Simulate control", "", "Simulate {my} pressing {0}", "Control the movement by events.", "SimulateControl");

AddNumberParam("Vector X", "The new horizontal movement vector, in pixels per second.");
AddAction(11, 0, "Set vector X", "", "Set {my} vector X to <i>{0}</i>", "Set the X component of motion.", "SetVectorX");

AddNumberParam("Vector Y", "The new vertical movement vector, in pixels per second.");
AddAction(12, 0, "Set vector Y", "", "Set {my} vector Y to <i>{0}</i>", "Set the Y component of motion.", "SetVectorY");

AddNumberParam("Angle", "The angle of gravity in degrees.");
AddAction(13, 0, "Set angle of gravity", "", "Set {my} angle of gravity to <i>{0}</i> degrees", "Change the angle the player falls at.", "SetGravityAngle");

AddComboParamOption("Disabled");
AddComboParamOption("Enabled");
AddComboParam("State", "Set whether to enable or disable the behavior.");
AddAction(14, 0, "Set enabled", "", "Set {my} <b>{0}</b>", "Set whether this behavior is enabled.", "SetEnabled");

AddAction(15, 0, "Fall through", "", "Fall {my} down through jump-thru", "Fall through a jump-thru platform.", "FallThrough");

AddComboParamOption("Roll");
AddComboParamOption("Unroll");
AddComboParam("State", "Set whether to trigger rolling or unrolling");
AddAction(16, 0, "Trigger roll", "", "Trigger {my} <b>{0}</b>", "Trigger a roll or unroll", "TriggerRoll");

AddNumberParam("Slope Factor", "The new slope factor");
AddComboParamOption("Ground");
AddComboParamOption("Rolling");
AddComboParam("Variation", "Which variation of this parameter to set");
AddComboParamOption("Uphill");
AddComboParamOption("Downhill");
AddComboParam("Direction", "Which direction's slope factor to set");
AddAction(17, 0, "Set Slope Factor", "", "Set {my} {1}, {2} slope factor to <b>{0}</b>", "Set Slope Factor", "SetSlopeFactor");

//Stuff added in 1.0.2:

AddNumberParam("Air Drag Rate", "The new air drag rate");
AddAction(18, 0, "Set Air Drag Rate", "", "Set {my} air drag rate to <b>{0}</b>", "Set Air Drag Rate", "SetAirDragRate");

AddNumberParam("Air Drag Threshold", "The new air drag threshold");
AddComboParamOption("X Threshold");
AddComboParamOption("Y Threshold");
AddComboParam("Threshold", "Which threshold to set");
AddAction(19, 0, "Set Air Drag Threshold", "", "Set {my} air drag {1} to <b>{0}</b>", "Set Air Drag Threshold", "SetAirDragThreshold");


//////////////////////////////////////////////////////////////
// Expressions
AddExpression(0, ef_return_number, "Get speed", "", "Speed", "The current object speed, in pixels per second.");
AddExpression(1, ef_return_number, "Get hard max speed", "", "HardMaxSpeed", "The maximum speed setting under any circumstances, in pixels per second.");
AddExpression(2, ef_return_number, "Get soft max speed", "", "SoftMaxSpeed", "The maximum speed setting under the object's own power, in pixels per second.");
AddExpression(3, ef_return_number, "Get acceleration", "", "Acceleration", "The acceleration setting, in pixels per second per second.");
AddExpression(4, ef_return_number, "Get friction", "", "Friction", "The friction setting, in pixels per second per second.");
AddExpression(5, ef_return_number, "Get deceleration", "", "Deceleration", "The deceleration setting, in pixels per second per second.");
AddExpression(6, ef_return_number, "Get air acceleration", "", "AirAcceleration", "The acceleration setting when in midair, in pixels per second per second.");
AddExpression(7, ef_return_number, "Get air friction", "", "AirFriction", "The friction setting when in midair, in pixels per second per second.");
AddExpression(8, ef_return_number, "Get air deceleration", "", "AirDeceleration", "The deceleration setting when in midair, in pixels per second per second.");
AddExpression(9, ef_return_number, "Get air soft max speed", "", "AirSoftMaxSpeed", "The maximum speed setting under any circumstances, in pixels per second.");
AddExpression(10, ef_return_number, "Get rolling acceleration", "", "RollAcceleration", "The acceleration setting when rolling, in pixels per second per second.");
AddExpression(11, ef_return_number, "Get rolling friction", "", "RollFriction", "The friction setting when rolling, in pixels per second per second.");
AddExpression(12, ef_return_number, "Get rolling deceleration", "", "RollDeceleration", "The deceleration setting when rolling, in pixels per second per second.");
AddExpression(13, ef_return_number, "Get rolling deceleration", "", "RollDeceleration", "The deceleration setting when rolling, in pixels per second per second.");
AddExpression(14, ef_return_number, "Get roll threshold", "", "RollThreshold", "The speed required to begin rolling, in pixels per second.");
AddExpression(15, ef_return_number, "Get unroll friction", "", "UnrollThreshold", "The speed below which the object unrolls, in pixels per second.");
AddExpression(16, ef_return_number, "Get maximum jump strength", "", "JumpStrength", "The maximum jump strength setting, in pixels per second.");
AddExpression(17, ef_return_number, "Get minimum jump strength", "", "MinJumpStrength", "The minimum jump strength setting, in pixels per second");
AddExpression(18, ef_return_number, "Get gravity", "", "Gravity", "The gravity setting, in pixels per second per second.");
AddExpression(19, ef_return_number, "Get max fall speed", "", "MaxFallSpeed", "The maximum fall speed setting, in pixels per second.");
AddExpression(20, ef_return_number, "Get angle of motion", "", "MovingAngle", "The current angle of motion, in degrees.");
AddExpression(21, ef_return_number, "Get vector X", "", "VectorX", "The current X component of motion, in pixels.");
AddExpression(22, ef_return_number, "Get vector Y", "", "VectorY", "The current Y component of motion, in pixels.");
AddExpression(23, ef_return_number, "Get uphill slope factor", "", "SlopeFactorUp", "Amount, when multiplied by sin(surfaceAngle), that is added to the players speed when moving uphill, in pixels per second per second");
AddExpression(24, ef_return_number, "Get downhill slope factor", "", "SlopeFactorDown", "Amount, when multiplied by sin(surfaceAngle), that is added to the players speed when moving downhill, in pixels per second per second");
AddExpression(25, ef_return_number, "Get uphill rolling slope factor", "", "SlopeFactorUpRoll", "Amount, when multiplied by sin(surfaceAngle), that is added to the players speed when rolling uphill, in pixels per second per second");
AddExpression(26, ef_return_number, "Get downhill rolling slope factor", "", "SlopeFactorDownRoll", "Amount, when multiplied by sin(surfaceAngle), that is added to the players speed when rolling downhill, in pixels per second per second");
AddExpression(27, ef_return_number, "Get wall speed threshold", "", "WallSpeedThreshold", "Speed below which the object will fall off a wall or ceiling, in pixels per second.");


AddExpression(28, ef_return_number, "Get gravity angle", "", "GravityAngle", "The angle of gravity, in degrees.");

AddExpression(29, ef_return_number, "Get surface angle", "", "SurfaceAngle", "The angle of the collision segment the player is touching.");




AddExpression(30, ef_return_any, "Get debug value", "", "SonicPhysicsDebug", "A debug value used to debug the Sonic Physics behaviour");

//Stuff added in 1.0.2:
AddExpression(31, ef_return_number, "Get air drag rate", "", "AirDragRate", "The amount X speed is multiplied by each 1/60th of a second, under certain conditions.");

AddExpression(32, ef_return_number, "Get air drag X threshold", "", "AirDragXThreshold", "X Speed, in pixels per second, above which Air Drag is applied.");
AddExpression(33, ef_return_number, "Get air drag Y threshold", "", "AirDragYThreshold", "Y Speed, in pixels per second, above which Air Drag is applied.");

ACESDone();

// Property grid properties for this plugin
var property_list = [
	new cr.Property(ept_float, "Soft Max Speed", 360, "The maximum speed, in pixels per second, the object can accelerate to under its own power."),
	new cr.Property(ept_float, "Hard Max speed", 1920, "The maximum speed, in pixels per second, the object can accelerate to under any circumstances."),
	new cr.Property(ept_float, "Acceleration", 168.75, "The rate of acceleration, in pixels per second per second."),
	new cr.Property(ept_float, "Friction", 168.75, "The rate at which the object decelerates passively, in pixels per second per second."),
	new cr.Property(ept_float, "Deceleration", 1800, "The rate at which the object decelerates actively, in pixels per second per second."),
	new cr.Property(ept_float, "Air Acceleration", 337.5, "The rate of acceleration when in midair, in pixels per second per second."),
	new cr.Property(ept_float, "Air Friction", 0, "The rate at which the object decelerates passively when in midair, in pixels per second per second."),
	new cr.Property(ept_float, "Air Deceleration", 337.5, "The rate at which the object decelerates actively when in midair, in pixels per second per second."),
	new cr.Property(ept_float, "Air Soft Max Speed", 360, "The maximum speed, in pixels per second, the object can accelerate to under its own power when in midair."),
	new cr.Property(ept_float, "Roll Acceleration", 0, "The rate of acceleration when in midair, in pixels per second per second."),
	new cr.Property(ept_float, "Roll Friction", 85.375, "The rate at which the object decelerates passively when in midair, in pixels per second per second."),
	new cr.Property(ept_float, "Roll Deceleration", 534.375, "The rate at which the object decelerates actively when in midair, in pixels per second per second."),
	new cr.Property(ept_float, "Roll Soft Max Speed", 960, "The maximum speed, in pixels per second, the object can accelerate to under its own power while rolling."),
	new cr.Property(ept_float, "Roll Threshold", 61.875, "The speed required to begin rolling, in pixels per second."),
	new cr.Property(ept_float, "Unroll Threshold", 30, "The speed below which the object unrolls, in pixels per second."),
	new cr.Property(ept_float, "Uphill Slope Factor", 450, "Amount, when multiplied by sin(surfaceAngle), that is subtracted from the object's speed when moving uphill, in pixels per second per second."),
	new cr.Property(ept_float, "Downhill Slope Factor", 450, "Amount, when multiplied by sin(surfaceAngle), that is added to the object's speed when moving downhill, in pixels per second per second."),
	new cr.Property(ept_float, "Uphill Roll Slope Factor", 281.25, "Amount, when multiplied by sin(surfaceAngle), that is subtracted from the object's speed when rolling uphill, in pixels per second per second."),
	new cr.Property(ept_float, "Downhill Roll Slope Factor", 1125, "Amount, when multiplied by sin(surfaceAngle), that is added to the object's speed when rolling downhill, in pixels per second per second."),
	new cr.Property(ept_float, "Wall Speed Threshold", 150, "Speed below which the object will fall off a wall or ceiling, in pixels per second."),
	new cr.Property(ept_float, "Max Jump strength", 390, "Speed at which jumps start, in pixels per second."),
	new cr.Property(ept_float, "Min Jump strength", 240, "Speed at which jumps are cut short to, if jump is released, in pixels per second."),
	new cr.Property(ept_float, "Gravity", 787.5, "Acceleration from gravity, in pixels per second per second."),
	new cr.Property(ept_float, "Max fall speed", 960, "Maximum speed object can reach in freefall, in pixels per second."),
	new cr.Property(ept_combo, "Rolling Enabled", "Yes", "If enabled, object can roll with down arrow or simulated control.", "No|Yes"),
	new cr.Property(ept_combo, "Rolling Jump Control Lock", "Enabled", "If enabled, object cannot use horizontal controls during a rolling jump.", "Disabled|Enabled"),
	new cr.Property(ept_combo, "Set Angle", "Yes", "If enabled, object will automatically change its angle at 90 degree intervals when moving on angled surfaces.", "No|Yes"),
	new cr.Property(ept_combo, "Default controls", "Yes", "If enabled, arrow keys control movement.  Otherwise, use the 'simulate control' action.", "No|Yes"),
	new cr.Property(ept_combo, "Initial state", "Enabled", "Whether to initially have the behavior enabled or disabled.", "Disabled|Enabled"),
	new cr.Property(ept_float, "Air Drag Rate", 0.9875, "The amount X speed is multiplied by each 1/60th of a second, under certain conditions."),
	new cr.Property(ept_float, "Air Drag Y Threshold", -240, "Y Speed, in pixels per second, above which Air Drag is applied. Must be below 0."),
	new cr.Property(ept_float, "Air Drag X Threshold", 7.5, "X Speed, in pixels per second, above which Air Drag is applied."),
	new cr.Property(ept_float, "Downhill Slope Factor Threshold", 0, "Distance, in degrees, from 0, under which downhill slope factor will not be applied."),
	new cr.Property(ept_float, "Uphill Slope Factor Threshold", 0, "Distance, in degrees, from 0, under which uphill slope factor will not be applied."),
	new cr.Property(ept_float, "Falling Angle Threshold", 46, "The lowest angle of terrain the object can fall off of."),
	new cr.Property(ept_combo, "Ceiling Mode", "Cling", "How the behaviour handles sloped ceilings", "Stop|Push|Cling"),
	new cr.Property(ept_float, "Convex Angle Threshold", 40, "The maximum difference in surface angle before the behaviour loses its grip")
	];
	
// Called by IDE when a new behavior type is to be created
function CreateIDEBehaviorType()
{
	return new IDEBehaviorType();
}

// Class representing a behavior type in the IDE
function IDEBehaviorType()
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
}

// Called by IDE when a new behavior instance of this type is to be created
IDEBehaviorType.prototype.CreateInstance = function(instance)
{
	return new IDEInstance(instance, this);
}

// Class representing an individual instance of an object in the IDE
function IDEInstance(instance, type)
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
	
	// Save the constructor parameters
	this.instance = instance;
	this.type = type;
	
	// Set the default property values from the property table
	this.properties = {};
	
	for (var i = 0; i < property_list.length; i++)
		this.properties[property_list[i].name] = property_list[i].initial_value;
}

// Called by the IDE after all initialization on this instance has been completed
IDEInstance.prototype.OnCreate = function()
{
}

// Called by the IDE after a property has been changed
IDEInstance.prototype.OnPropertyChanged = function(property_name)
{
	// Set initial value for "default controls" if empty (added r51)
	if (property_name === "Default controls" && !this.properties["Default controls"])
		this.properties["Default controls"] = "Yes";
}
