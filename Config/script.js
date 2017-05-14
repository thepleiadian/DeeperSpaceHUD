"use strict";
this.name			= "DeeperSpaceDataBridge";
this.author			= "pleiadian";
this.copyright		= "2017 pleiadian";
this.description	= "Provides access to current system data to DPRS";
this.licence		= "CC BY-NC-SA 4.0";

// -----------------------------------------------------------------------------

// Current system
this.$dpr_currentLocalSystem;
// Target system
this.$dpr_destinationSystem;
// Next system on route
this.$dpr_nextSystem;
this.$dpr_nextSystemID;
// Flight time needed to next system in hours
this.$dpr_timeToNextSystem;
// System risk rating
this.$dpr_systemRisk;
// Current system government form
this.$dpr_govDesc;
// This system's economy
this.$dpr_ecoDesc;
// System TL if not interstellar space
this.$dpr_systemTL;
// Current speed in m/s
this.$dpr_currentSpeed;
// Torus velocity
this.$dpr_torusVelocity;

// Testing dial
this.$dpr_teststring;

// -----------------------------------------------------------------------------

// This is called when the script is detected
this.startUp = function ()
{
	// Check every second for current system
	this.$dpr_interval = 0.5;
	
	// The timer
	this.$dpr_timer = new Timer(this, this.$acquireInfo, 0, this.$dpr_interval);
	// Start the clock
	this.$dpr_timer.start();
}



// Centers text for us
this.$CenteredText = function(txt, width) { //insert spaces before text to align to center in width
	var t = ""+txt; //force to srting, else txt.length is undefined for numbers
	var w = width / 2;
//	log("combat_MFD", "CT1 "+txt+" "+t.length+" "+w); //debug
	while( t && t.length < w ) { //for fixed with font in setCustomHUDDial
		t = " " + t;
	}
	return(t);
}


// A convenience call which returns the distance between two vectors for us -
// In this case we need player position and the desired target point. Since
// We can always acquire the player vector directly, one only needs to specify
// the target vector point.
this.$calculateDistance = function (tx, ty, tz)
{
	var p = player.ship;
	var x = p.position.x;
	var y = p.position.y;
	var z = p.position.z;
	
	// The distance formula:
	var dist = Math.sqrt(((tx-x) * (tx-x)) + ((ty-y) * (ty-y)) + ((tz-z) * (tz-z)));
	//(p2.x - p1.x)^2 + (p2.y - p1.y)^2 + (p2.z - p1.z)^2
	
	return dist;
}


// This is the main call which not only populates the system and travel info in
// the top left, but also acquires the info about important and nearby object to
// be displayed in the radar bar on the right.

this.$acquireInfo = function()
{
	// ME!
	var p = player.ship;
	var i;
	
	// Get current system and TL, if in normal system
	if (!System.isInterstellarSpace)
	{
		this.$dpr_currentLocalSystem = system.name;
		this.$dpr_systemTL = (system.techLevel+1);
		
		// Gov info, risk assessment
		var govLevel  = system.government;
		
		// Get all ships in system
		var ships = system.allShips;
		
		// How many of those are pirates?
		var ships_pirate = 0;
		// And police?
		var ships_police = 0;
		// Maybe we have Thargoids too?
		var ships_thargoid = 0;
		
		
		// ---------------------------------------------------------------------
		// RISK ASSESSMENT:
		// ---------------------------------------------------------------------
		// Since just counting ships in space with certain roles removes a
		// strategic element of the game, we'll just take the ships near the
		// player into account - so that it might still be risky to go somewhere
		// else in the system.
		for (i=1; i<=ships.length; i++)
		{
			if (ships[i-1].isPirate == true &&   ships[i-1].isInSpace == true)
			{
				var dist = this.$calculateDistance(ships[i-1].position.x, ships[i-1].position.y, ships[i-1].position.z);
				if (dist <= 25000) { ships_pirate++; }
			}
		}
		for (i=1; i<=ships.length; i++)
		{
			if (ships[i-1].isPolice == true &&   ships[i-1].isInSpace == true)
			{
				var dist = this.$calculateDistance(ships[i-1].position.x, ships[i-1].position.y, ships[i-1].position.z);
				if (dist <= 25000) { ships_police++; }
			}
		}
		for (i=1; i<=ships.length; i++)
		{
			if (ships[i-1].isThargoid == true &&   ships[i-1].isInSpace == true)
			{
				var dist = this.$calculateDistance(ships[i-1].position.x, ships[i-1].position.y, ships[i-1].position.z);
				if (dist <= 25000) { ships_thargoid++; }
			}
		}
		
		// Total number of ships
		var ships_total = ships_pirate + ships_thargoid + ships_police;
		
		if (ships_total > 0)
		{		
			// Risk factor is therefore like so:
			var perc_pirates  = (ships_pirate / ships_total);
			var perc_thargoid = (ships_thargoid / ships_total);
			var perc_police   = (ships_police / ships_total);
			var perc_total    = (perc_pirates + perc_thargoid);
			
			if (perc_total <  0.2) { this.$dpr_systemRisk = "Low"; }
			if (perc_total >= 0.2) { this.$dpr_systemRisk = "Moderate"; }
			if (perc_total >= 0.4) { this.$dpr_systemRisk = "Substantial"; }
			if (perc_total >= 0.6) { this.$dpr_systemRisk = "Severe"; }
			if (perc_total >= 0.8) { this.$dpr_systemRisk = "Critical"; }	
		}
		else
		{ this.$dpr_systemRisk = "None"; }
		
		
		
		// ---------------------------------------------------------------------
		// -- END RISK ASSESSMENT -- 
		// ---------------------------------------------------------------------
		
		
		// Test
		//this.$dpr_systemRisk = this.$dpr_systemRisk + " ("+perc_total+")";
		
		this.$dpr_govDesc = system.governmentDescription;
		this.$dpr_ecoDesc = system.economyDescription;
	}
	if (System.isInterstellarSpace)
	{
		this.$dpr_currentLocalSystem = "Deep Space";
		this.$dpr_systemTL = "0";
		this.$dpr_systemRisk = "## UNKNOWN ##";
		this.$dpr_govDesc = "## UNKNOWN ##";
		this.$dpr_ecoDesc = "None";
	}

	// Destination / travel info -
	// Only works with Advanced Nav Array
	if (p.targetSystem !== system.ID && p.equipmentStatus("EQ_ADVANCED_NAVIGATIONAL_ARRAY") === "EQUIPMENT_OK")
	{
		var theroute = System.infoForSystem(galaxyNumber, system.ID).routeToSystem(System.infoForSystem(galaxyNumber, p.targetSystem), p.routeMode);
		var next  = System.infoForSystem(galaxyNumber, theroute.route[1]).name;
		this.$dpr_nextSystem = next;
		this.$dpr_nextSystemID = theroute.route[1];
	}
	
	// Get current speed... and determine if we are at Warp
	var speed = p.speed;
	if (speed > p.maxSpeed && speed < 5000)
	{ var sp = (p.speed / 1000); var real = sp.toFixed(2); this.$dpr_currentSpeed = real + " km/s"; }
	if (speed > p.maxSpeed && speed >= 5000)
	{ this.$dpr_currentSpeed = "TORUS DRIVE ACTIVE"; }
	if (speed <= p.maxSpeed)
	{ var sp = speed; this.$dpr_currentSpeed = sp.toFixed(2) + " m/s"; }
	// We also provide an extra dial showing actual Torus velocity
	if (speed > p.maxSpeed && speed >= 5000)
	{
		var sp = (speed / 1000);
		var real = sp.toFixed(2);
		this.$dpr_torusVelocity = "Torus Speed: " + real + " km/s"; }
	else
	{ this.$dpr_torusVelocity = ""; }

	// Acquire info about all current entities in system.
	// Ordered by what I believe it to be the order of importance.

	var ships	 = system.allShips; // This will not be used in "Nearest"-display
	var stations = system.stations;
	var waypts   = system.waypoints;
	var wormh    = system.wormholes;
	var planets  = system.planets;
	var sun      = system.sun;
	
	// The object nearest to player
	var nearest;
	var nearest_dist;
	
	// Go through all entities above to find out what's closest:
	
	// Stations
	for (i=1; i<=stations.length; i++)
	{
		var dist = this.$calculateDistance(stations[i-1].position.x, stations[i-1].position.y, stations[i-1].position.z);
		if (nearest_dist == null) { nearest_dist = dist; }
		if (dist < nearest_dist) { nearest_dist = (dist - stations[i-1].collisionRadius); nearest = stations[i-1]; }
	}
	// Waypoints
	for (i=1; i<=waypts.length; i++)
	{
		var dist = this.$calculateDistance(waypts[i-1].position.x, waypts[i-1].position.y, waypts[i-1].position.z);
		if (nearest_dist == null) { nearest_dist = dist; }
		if (dist < nearest_dist) { nearest_dist = (dist - waypts[i-1].collisionRadius); nearest = waypts[i-1]; }
	}
	// Planets
	for (i=1; i<=planets.length; i++)
	{
		var dist = this.$calculateDistance(planets[i-1].position.x, planets[i-1].position.y, planets[i-1].position.z);
		if (nearest_dist == null) { nearest_dist = dist; }
		if (dist < nearest_dist) { nearest_dist = (dist - planets[i-1].collisionRadius); nearest = planets[i-1]; }
	}
	// There's only one sun
	var sundist = this.$calculateDistance(sun.position.x, sun.position.y, sun.position.z);
	if (nearest_dist == null) { nearest_dist = sundist; }
	if (sundist < nearest_dist) { nearest_dist = (sundist - sun.collisionRadius); nearest = sun; }
	
	// Correction in distance
	nearest_dist = Math.round((nearest_dist * 10) / 10);
	var nearest_str  = "";
	if (nearest_dist < 1000) { nearest_str = nearest_dist + " m"; }
	if (nearest_dist > 1000) { nearest_str = (nearest_dist/1000) + " km"; }
	if (nearest_dist > 1000000000) { nearest_str = (nearest_dist / 1000000) + " mln. km"; }

	
	// Set all dial info
	p.setCustomHUDDial("DPR_CurrentSystem", this.$dpr_currentLocalSystem);
	p.setCustomHUDDial("DPR_CurrentSpeed",  this.$dpr_currentSpeed);
	p.setCustomHUDDial("DPR_TorusVelocity", this.$dpr_torusVelocity);
	p.setCustomHUDDial("DPR_SystemTL",		this.$dpr_systemTL);

	// The main info line below the large display
	var infoLine1 = "Current location:";
	var infoLine2 = this.$dpr_currentLocalSystem + " (G"+(galaxyNumber+1)+")";
	var infoLine3 = "";
	if (nearest)
	{ var infoLine3 = nearest.name; }
	
	//var infoLine3 = "GOVERNMENT: " + this.$dpr_govDesc + " - (" + this.$dpr_systemSecurity + ")";
	p.setCustomHUDDial("DPR_InfoLabel1", 	"Nearest:");
	p.setCustomHUDDial("DPR_InfoLabel2", 	"Sovereignty:");
	p.setCustomHUDDial("DPR_InfoLabel3", 	"Tech Level:");
	p.setCustomHUDDial("DPR_InfoLabel4", 	"Current Risk:");
	p.setCustomHUDDial("DPR_InfoLabel5", 	"Government:");
	p.setCustomHUDDial("DPR_InfoLabel6", 	"Economy:");
	
	if (p.targetSystem != system.ID && p.equipmentStatus("EQ_ADVANCED_NAVIGATIONAL_ARRAY") === "EQUIPMENT_OK")
	{
		// Calculate travel time
		var distly = System.infoForSystem(galaxyNumber, system.ID).distanceToSystem(System.infoForSystem(galaxyNumber, this.$dpr_nextSystemID));
		var time = (distly * distly);
		var timeInH = time.toFixed(2) + " Hours";
		
		p.setCustomHUDDial("DPR_InfoLabel7", 	"Current Destination: ".concat(System.infoForSystem(galaxyNumber, p.targetSystem).name));
		p.setCustomHUDDial("DPR_InfoLabel8", 	"Next System: ".concat(this.$dpr_nextSystem));
		p.setCustomHUDDial("DPR_InfoLabel9", 	"Travel Time for Jump: ".concat(timeInH));
	}
	else
	{
		p.setCustomHUDDial("DPR_InfoLabel7",  "");
		p.setCustomHUDDial("DPR_InfoLabel8",  "");
		p.setCustomHUDDial("DPR_InfoLabel9",  "");
	}
	
	p.setCustomHUDDial("DPR_InfoLine1", 	infoLine1);
	p.setCustomHUDDial("DPR_InfoLine2", 	infoLine2);
	p.setCustomHUDDial("DPR_InfoLine3",		infoLine3);
	p.setCustomHUDDial("DPR_InfoLine4",		system.inhabitantsDescription);
	p.setCustomHUDDial("DPR_InfoLine5",		this.$dpr_systemTL);
	p.setCustomHUDDial("DPR_InfoLine6",		this.$dpr_systemRisk);
	p.setCustomHUDDial("DPR_InfoLine7",		system.governmentDescription);
	p.setCustomHUDDial("DPR_InfoLine8",		system.economyDescription);
	

	// We now go through the found info for the radar info on the right side.
	// This is done through a loop which populates as many custom dials it
	// finds. In the actual plist we can avail of 50 custom lines.
	//p.setCustomHUDDial("DPR_TestDial", "Nearest: " + nearest.name + " (" + nearest_str + ")");
}