/**
 * ferjeruta.no 
 * ferjeruta.obj.js - Classes for the ferryservice object tree
 * (c) 2014 Jon Tungland (jon@tungland.org) - http://runnane.no/
 * Released under the GNU General Public License 2.0
 * See gpl-2.0.txt
 *
 * Project page: https://bitbucket.org/runnane/ferjeruta
 *
 */
 
//////////// FerryService
var FerryService = function (sambandXmlNode) {
	this.DeparturePoints = new Array();
	this.Name = 		$(sambandXmlNode).attr("name");
	this.Location1 = 	$(sambandXmlNode).attr("location1");
	this.Location2 = 	$(sambandXmlNode).attr("location2");
	this.ValidFrom = 	$(sambandXmlNode).attr("validfrom");
	this.ValidTo = 		$(sambandXmlNode).attr("validto");
	this.PriceZone = 	$(sambandXmlNode).attr("ticketzone");
	this.TripTime = 	$(sambandXmlNode).attr("time");
	this.Serial = 		$(sambandXmlNode).attr("serial");
	this.Operator = 	$(sambandXmlNode).attr("operator");
	this.RouteId = 		$(sambandXmlNode).attr("routeid");
	this.Url = 			$(sambandXmlNode).attr("url");
};
FerryService.prototype.AddDeparturePoint = function (departurep) {
	this.DeparturePoints.push(new DeparturePoint(departurep, this));
	return this.DeparturePoints[this.DeparturePoints.length-1]
};
FerryService.prototype.GetDeparturePoint = function (name) {
		var ret;
		$(this.DeparturePoints)
			.each(function (i) {
				if(this.Name == name) {
					ret = this;
					return false;
				}
			});
		return ret;
};

/////////// DeparturePoint
var DeparturePoint = function (pos, parentservice) {
	this.Name = $(pos).attr("location");
	this.DepartureDays = new Array();
	this.ParentService = parentservice;
};

DeparturePoint.prototype.GetDay = function (day) {
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
		.each(function (i) {
			if(this.DayOfWeek == day) {
				ret = this;
				return false;
			}
		});
	if(ret == undefined) {
		ret = new ServiceDay(day, this);
		this.DepartureDays.push(ret);
	};
	return ret;
};

//DeparturePoint.prototype.AddAvgang = function (days, time, rute, comments) {
DeparturePoint.prototype.AddAvgang = function (days, departureXml) {
		var parts = days.split(",");
		var tt = this;
		$(parts)
			.each(function (i) {
				tt.GetDay(this)
					.AddAvgang(departureXml);
			});
};

DeparturePoint.prototype.GetNextDeparture = function (dayofweek, hour, minute) {
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
var ServiceDay = function (day, timetabl) {
	this.DayOfWeek = parseInt(day, 10);
	this.Departures = new Array();
	this.ParentDeparturePoint = timetabl;
};

ServiceDay.prototype.DayName = function () {
	return GetDayName(this.DayOfWeek);
}
ServiceDay.prototype.NextDay = function () {
	return this.ParentDeparturePoint.GetDay(this.DayOfWeek+1);
};
ServiceDay.prototype.PreviousDay = function () {
	return this.ParentDeparturePoint.GetDay(this.DayOfWeek-1);
};

ServiceDay.prototype.AddAvgang = function (departureXml) {
		this.Departures.push(new Departure(departureXml, this));
};

ServiceDay.prototype.GetNextDeparture = function (hour, minute) {
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
			.each(function (i) {
				var departure = this;
				if(departure.Hour == 0 &&
					departure.Minute == 0) {
					// skip it, if this is firs this day, we gonna have a bad time
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
ServiceDay.prototype.GetFirstDeparture = function () {
		return this.Departures[0];
};

////////////// Departure
var Departure = function (departureXml, day) {
	this.TimeOfDay 	= $(departureXml).attr("time");
	this.Rute		= $(departureXml).attr("rute");
	this.Comments 	= $(departureXml).attr("comments");
	this.ParentDay 	= day;

	var parts = this.TimeOfDay.split(":");
	this.Hour = parseInt(parts[0], 10);
	this.Minute = parseInt(parts[1], 10);
};

Departure.prototype.MinutesUntil = function () {
		var now = new Date();
		return TimeBetweenTwoTimes(now.getHours(), now.getMinutes(), this.Hour, this.Minute);
};

Departure.prototype.Next = function () {
	return this.ParentDay.GetNextDeparture(this.Hour, this.Minute);
};

Departure.prototype.Previous = function () {
	// todo Not implemented.
	throw "Critical: Not Implemented";
};

Departure.prototype.Output = function (verbose) {
	if(verbose) {
		return this.TimeOfDay + " (om " + MinsToString(this.MinutesUntil()) + ")";
	} else {
		return this.TimeOfDay;
	}
};

Departure.prototype.HowLongUntil = function () {
	return MinsToString(this.MinutesUntil());
};
