/**
 * ferjeruta.no
 * ferjeruta.obj.js - Classes for the ferryservice object tree
 * (c) 2014 Jon Tungland (jon@tungland.org) - http://runnane.no/
 * Released under the GNU General Public License 2.0
 * See gpl-2.0.txt
 *
 * Project page: https://github.com/runnane/ferjeruta
 *
 */

/**
 * Main FerryService init
 * @param xml
 * @constructor
 */
var FerryService = function (xml) {
	'use strict';
	this.rawXML             = xml;
	this.DeparturePoints    = [];
	this.ServiceFlags       = {};
	this.ServiceLines       = {};
	this.Name               = $(xml).attr("name");
	this.Location1          = $(xml).attr("location1");
	this.Location2          = $(xml).attr("location2");
	this.ValidFrom          = $(xml).attr("validfrom");
	this.ValidTo            = $(xml).attr("validto");
	this.PriceZone          = $(xml).attr("ticketzone");
	this.TripTime           = $(xml).attr("time");
	this.Serial             = $(xml).attr("serial");
	this.Operator           = $(xml).attr("operator");
	this.RouteId            = $(xml).attr("routeid");
	this.Url                = $(xml).attr("url");
	this.AreaCode           = $(xml).attr("areaCode");
	this.Comments           = $(xml).attr("comments");
};
FerryService.prototype.AddDeparturePoint = function (departurep) {
	'use strict';
	this.DeparturePoints.push(new DeparturePoint(departurep, this));
	return this.DeparturePoints[this.DeparturePoints.length-1];
};
FerryService.prototype.GetDeparturePoint = function (name) {
	'use strict';
	var ret;
	$(this.DeparturePoints)
		.each(function () {
			if(this.Name == name) {
				ret = this;
				return false;
			}
		});
	return ret;
};

FerryService.prototype.AddFlag = function(xml){
	'use strict';
	this.ServiceFlags[$(xml).attr("code")] = new ServiceFlag(xml, this);
	return this.ServiceFlags[$(xml).attr("code")];
};

FerryService.prototype.AddLine = function(xml){
	'use strict';
	this.ServiceLines[$(xml).attr("id")] = new ServiceLine(xml, this);
	return this.ServiceLines[$(xml).attr("id")];
};

FerryService.prototype.Hide = function(ret){
	'use strict';
	var set = _fr.GetSetting("HiddenServices");
	set[this.Name] = true;
	_fr.SetSetting("HiddenServices", set);
	if(ret != undefined && ret == true){
		$.mobile.changePage("#pageMainview", {transition: "none"});
	}
};


/////////// DeparturePoint
var ServiceFlag = function (xml, parent){
	'use strict';
	this.rawXML             = xml;
	this.ParentService      = parent;

	this.Code				= $(xml).attr("code");
	this.Comments			= $(xml).attr("comments");
	this.Color				= $(xml).attr("color");
};

/////////// DeparturePoint
var ServiceLine = function (xml, parent){
	'use strict';
	this.rawXML				= xml;
	this.ParentService 		= parent;
	this.Id					= $(xml).attr("id");
	this.Name				= $(xml).attr("name");
	this.Phone				= $(xml).attr("phonenumber");
	this.Type				= $(xml).attr("type");
	this.Comments			= $(xml).attr("comments");
	this.Color				= $(xml).attr("color");
	this.rawFlags			= $(xml).attr("flags");
	this.Flags				= {};

	// Map Flags
	var mObj = this;
	if(mObj.rawFlags != undefined){
		$.each(mObj.rawFlags.split(","),function(index, val){
			if(val){
				mObj.Flags[val] = mObj.ParentService.ServiceFlags[val];
			}

		});
	}

};

/////////// DeparturePoint
var DeparturePoint = function (xml, parent) {
	'use strict';
	this.rawXML				= xml;
	this.ParentService      = parent;

	this.Name               = $(xml).attr("location");
	this.Comments			= $(xml).attr("comments");

	this.DepartureDays 		= [];
};

DeparturePoint.prototype.GetDay = function (day) {
	'use strict';
	var ret;
	day = parseInt(day, 10);

	// Do this to tolerate overflow etc
	if(day == 8){
		day = 1;
	}
	if(day == 0){
		day = 7;
	}

	if(day < 1 || day > 7) {
		return undefined;
	}
	$(this.DepartureDays)
		.each(function() {
			if(this.DayOfWeek == day) {
				ret = this;
				return false;
			}
		});
	if(ret == undefined) {
		ret = new ServiceDay(day, this);
		this.DepartureDays.push(ret);
	}
	return ret;
};

DeparturePoint.prototype.AddAvgang = function (days, xml) {
	'use strict';
	var parts = days.split(",");
	var tt = this;
	$(parts)
		.each(function() {
			tt.GetDay(this)
				.AddAvgang(xml);
		});
};

DeparturePoint.prototype.GetNextDeparture = function (dayofweek, hour, minute) {
	'use strict';
	if(dayofweek == undefined) {
		var now = new Date();
		dayofweek = (now.getDay() + 1);
		hour = now.getHours();
		minute = now.getMinutes();
	}
	return this.GetDay(dayofweek)
		.GetNextDeparture(hour, minute);
};

////////////// ServiceDay
var ServiceDay = function (day, parent) {
	'use strict';
	this.ParentDeparturePoint 	= parent;
	this.DayOfWeek 				= parseInt(day, 10);
	this.Departures 			= [];
};

ServiceDay.prototype.DayName = function () {
	'use strict';
	return GetDayName(this.DayOfWeek);
};

ServiceDay.prototype.NextDay = function () {
	return this.ParentDeparturePoint.GetDay(this.DayOfWeek+1);
};

ServiceDay.prototype.PreviousDay = function () {
	'use strict';
	return this.ParentDeparturePoint.GetDay(this.DayOfWeek-1);
};

ServiceDay.prototype.AddAvgang = function (departureXml) {
	'use strict';
	this.Departures.push(new Departure(departureXml, this));
};

ServiceDay.prototype.GetNextDeparture = function (hour, minute) {
	'use strict';
	hour = parseInt(hour, 10);
	minute = parseInt(minute, 10);
	var dep;

	// Currently have two methods of finding next departure.
	// One flexible without requiring sorting, and one quick.
	// We are using method 2

	//Method 1, iterate through all, in case deaparture times are not sorted
	/*
    $(this.Departures).each(function(i){
        var departure = this;
        if (departure.Hour == 0 && departure.Minute == 0) {
            // skip it, if this is firs this day, we gonna have a bad time
        } else {
            if(isEarlier(hour, minute, departure.Hour, departure.Minute)){
                if(dep == undefined){
                    dep=departure;
                }else if(isEarlier(departure.Hour, departure.Minute, dep.Hour, dep.Minute)){
                    dep=departure;
                }
            }
        }
    });
    */

	// Method 2, break after we found first. lighter, but only works reliable when departure times are sorted in xml.
	$(this.Departures)
		.each(function () {
			var departure = this;
			if(departure.Hour == 0 &&
				departure.Minute == 0) {
				// skip it, if this is first this day, we gonna have a bad time
			} else if(isEarlier(hour, minute, departure.Hour, departure.Minute)) {
				dep = departure;
				return false;
			}
		});

	// We have no more departures today, check next day
	if(dep == undefined) {
		var day = this.DayOfWeek == 7 ? 1 :
			(this.DayOfWeek + 1);
		dep = this.ParentDeparturePoint.GetDay(day)
			.GetFirstDeparture();
	}

	if(dep == undefined) {
		// Still not able to find next departure
		throw "Critical: Unable to find next departure.";
	}
	return dep;
};

ServiceDay.prototype.GetFirstDeparture = function() {
	'use strict';
	return this.Departures[0];
};

////////////// Departure
var Departure = function (xml, parent) {
	'use strict';
	this.rawXML				= xml;
	this.ParentDay          = parent;

	this.TimeOfDay          = $(xml).attr("time");
	this.rawLine            = $(xml).attr("line");
	this.Comments           = $(xml).attr("comments");
	this.Color              = $(xml).attr("color");
	this.rawFlags			= $(xml).attr("flags");
	this.Flags				= {};
	this.Line				= this.ParentDay.ParentDeparturePoint.ParentService.ServiceLines[this.rawLine];

	var parts               = this.TimeOfDay.split(":");
	this.Hour               = parseInt(parts[0], 10);
	this.Minute             = parseInt(parts[1], 10);

	// Map Flags
	var mObj = this;
	if(mObj.rawFlags != undefined){
		$.each(mObj.rawFlags.split(","),function(index, val){
			mObj.Flags[val] = mObj.ParentDay.ParentDeparturePoint.ParentService.ServiceFlags[val];
		});
	}
};

Departure.prototype.MinutesUntil = function () {
	'use strict';
	var now = new Date();
	return TimeBetweenTwoTimes(now.getHours(), now.getMinutes(), this.Hour, this.Minute);
};

Departure.prototype.Next = function () {
	'use strict';
	return this.ParentDay.GetNextDeparture(this.Hour, this.Minute);
};

Departure.prototype.Previous = function () {
	'use strict';
	// todo Not implemented.
	throw "Critical: Not Implemented";
};

Departure.prototype.Output = function (verbose) {
	'use strict';
	var asterisk = (this.Comments && this.Comments.length > 0) ? "*" : "";
	if(verbose) {
		return this.TimeOfDay + asterisk + " (om " + MinsToString(this.MinutesUntil()) + ")";
	} else {
		return this.TimeOfDay + asterisk;
	}
};

Departure.prototype.OutputElement = function () {
	'use strict';
	var departure = this;
	var hasComment = (this.Comments && this.Comments.length > 0);
	
	if (hasComment) {
		var elem = $("<span />")
			.addClass("departure-with-comment")
			.text(this.TimeOfDay)
			.append($("<span />").addClass("departure-asterisk").text("*"))
			.attr("title", this.Comments)
			.click(function(e) {
				e.stopPropagation();
				e.preventDefault();
				$("#departureInfoTitle").text("Avgang " + departure.TimeOfDay);
				$("#departureInfoText").text(departure.Comments);
				$("#departureInfoPopup").popup("open", {
					positionTo: "window",
					transition: "pop"
				});
			});
		return elem;
	} else {
		return $("<span />").text(this.TimeOfDay);
	}
};

Departure.prototype.HowLongUntil = function () {
	'use strict';
	return MinsToString(this.MinutesUntil());
};