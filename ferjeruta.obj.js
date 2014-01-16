/**
 * ferjeruta.no // js code backend
 * jon@tungland.org // www.runnane.no // 2014
 *
 * https://bitbucket.org/runnane/ferjelista
 *
 **/

//////////// FerryService
var FerryService = function (sn, loc1,	loc2, valfr, valto, pricezone, time, serial, operator, routeid) {
	this.timeTableList = new Array();
	this.Name = sn;
	this.Location1 = loc1;
	this.Location2 = loc2;
	this.ValidFrom = valfr;
	this.ValidTo = valto;
	this.PriceZone = pricezone;
	this.TripTime = time;
	this.Serial = serial;
	this.Operator = operator;
	this.RouteId = routeid;
};
FerryService.prototype.AddRute = function (pos) {
		this.timeTableList.push(new TimeTable(pos));
};
FerryService.prototype.GetRute = function (name) {
		var ret;
		$(this.timeTableList)
			.each(function (i) {
				if(this.Name == name) {
					ret = this;
					return false;
				}
			});
		return ret;
};

/////////// TimeTable
var TimeTable = function (pos,parent) {
	this.Name = pos;
	this.DepartureDays = new Array();
	this.ParentService = parent;
};

TimeTable.prototype.GetDay = function (day) {
	var ret;
	day = parseInt(day, 10);
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

TimeTable.prototype.AddAvgang = function (days, time, rute, comments) {
		var parts = days.split(",");
		var tt = this;
		$(parts)
			.each(function (i) {
				tt.GetDay(this)
					.AddAvgang(time, rute, comments);
			});
};

TimeTable.prototype.GetNextDeparture = function (dayofweek, hour, minute) {
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
	this.ParentTimeTable = timetabl;
};

ServiceDay.prototype.AddAvgang = function (time, rute, comments) {
		this.Departures.push(new Departure(time, rute, comments, this));
};

ServiceDay.prototype.GetNextDeparture = function (hour, minute) {
		hour = parseInt(hour, 10);
		minute = parseInt(minute, 10);
		var dep;

		/*
		//Method 1, iterate through all, in case deaparture times are not sorted
		$(this.Departures).each(function(i){
			var departure = this;
			dprint("dep='"+departure.Hour+"':'"+departure.Minute+"' ("+departure.TimeOfDay+") to now='"+hour+"':'"+minute+"'");
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
			dep = this.ParentTimeTable.GetDay(day)
				.GetFirstDeparture();
		}

		if(dep == undefined) {
			// Still not able to find next departure
			throw "Critical: Unable to find next departure.";
		}
		//dprint("done for this day..");
		return dep;
};
ServiceDay.prototype.GetFirstDeparture = function () {
		return this.Departures[0];
};

////////////// Departure
var Departure = function (time, rute, comments, day) {
	this.TimeOfDay = time;
	this.Rute = rute;
	this.Comments = comments;
	this.ParentDay = day;
	var parts = time.split(":");
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