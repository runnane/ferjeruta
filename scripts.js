/**
 * rFerjelistaWeb // ferjeruta.no // js code backend
 * jon@tungland.org // www.runnane.no // 2013
 *
 * https://bitbucket.org/runnane/rferjelistaweb/
 *
 **/
 
/**
 * helper functions
 **/
 
var TimeBetweenTwoTimes = function (fm,	fs, lm, ls) {
	var date1 = new Date(2000, 0, 1, fm, fs);
	var date2 = new Date(2000, 0, 1, lm, ls);
	if(date2 < date1) {
		date2.setDate(date2.getDate() + 1);
	}
	var diff = date2 - date1;
	return(diff / 60000);
};

var SecsToString = function (secs) {
	var hours = Math.floor(secs / 60 / 60);
	secs -= hours * 60 * 60;
	var minutes = Math.floor(secs / 60);
	secs -= minutes * 60;
	var seconds = Math.floor(secs);
	return hours + " t, " + minutes + " m, " + seconds + " s";
};

var MinsToString = function (minutes) {
	var hours = Math.floor(minutes / 60);
	minutes -= hours * 60;
	if(hours >= 1) {
		return hours + ":" + strpad(minutes,2) + " min";
	} else {
		return minutes + " min";
	}
};

var GetDayName = function (num, isjsdate) {
	var weekday = new Array(7);
	weekday[0] = "Søndag";
	weekday[1] = "Mandag";
	weekday[2] = "Tirsdag";
	weekday[3] = "Onsdag";
	weekday[4] = "Torsdag";
	weekday[5] = "Fredag";
	weekday[6] = "Lørdag";
	if(isjsdate != 1) {
		num--;
	}
	return weekday[num];
};

var strpad = function (str, maxm) {
	str = str.toString();
	return str.length < maxm ? strpad("0" + str, maxm) : str;
}

var dprint = function (text) {
	//	var v = $("#debugougput").html();
	//	$("#debugougput").html(v + "<br />" + text);
};

var isEarlier = function (h1, m1, h2, m2) {
	if(h1 < h2 || (h1 == h2 && m1 < m2)) {
		return true;
	}
	return false;
};

// extend internal function
Date.prototype.toNorwString = function () {
	return this.getDate() + "." + (this.getMonth() + 1) + "." + this.getFullYear();
};

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
				if(this.from == name) {
					ret = this;
					return false;
				}
			});
		return ret;
};

/////////// TimeTable
var TimeTable = function (pos) {
	this.from = pos;
	this.departureDays = new Array();
};

TimeTable.prototype.GetDay = function (day) {
	var ret;
	day = parseInt(day, 10);
	if(day < 1 || day > 7) {
		return undefined;
	}
	$(this.departureDays)
		.each(function (i) {
			if(this.DayOfWeek == day) {
				ret = this;
				return false;
			}
		});
	if(ret == undefined) {
		ret = new ServiceDay(day, this);
		this.departureDays.push(ret);
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

//////////// coreFerjelista
// main function prototype base page
////////////

var coreFerjelista = function () {
	this.serviceList = new Array();

	this.Initialize = function () {
		console.log("[debug] coreFerjelista::Initialize() starting");
		var pobj = this;
		$.get("routes.xml", function (xml) {
			console.log("[debug] coreFerjelista::Initialize() got xml");
			$("route", xml)
				.each(function (i) {
					var samband = pobj.AddSamband(
						$(this).attr("name"), 
						$(this).attr("location1"), 
						$(this).attr("location2"), 
						$(this).attr("validfrom"),
						$(this).attr("validto"), 
						$(this).attr("ticketzone"), 
						$(this).attr("time"), 
						$(this).attr("serial"),
						$(this).attr("operator"),
						$(this).attr("routeid")
					);
					$("departurepoint", this)
						.each(function (j) {
							var departurepoint = $(this).attr("location");
							samband.AddRute(departurepoint);
							$("weekday", this)
								.each(function (k) {
									var weekdays = $(this).attr("day");
									$("departure",this)
										.each(function (l) {
												samband
													.GetRute(departurepoint)
													.AddAvgang(
														weekdays,
														$(this).attr("time"),
														$(this).attr("rute"),
														$(this).attr("comments")
													);
											});
								});
						});
					//return false;
				}); // each route
			console.log("[debug] coreFerjelista::Initialize() route table views populated");
			pobj.RefreshServices();
		}); // http get
	}; // Initialize

	this.AddSamband = function (name, location1, location2, validfrom, validto, pricezone, time, serial, operator, routeid) {
		var fr = new FerryService(name, location1, location2, validfrom, validto, pricezone, time, serial, operator, routeid);
		this.serviceList.push(fr);
		return fr;
	};

	this.GetSamband = function (name) {
		var ret;
		$(this.serviceList)
			.each(function (i) {
				if(this.Name == name) {
					ret = this;
					return false;
				}
			});
		return ret;
	};

	this.GetFirst = function (ferryline, departurepoint, dayofweek) {
		return this.GetSamband(ferryline)
			.GetRute(departurepoint)
			.fTimeTable.GetDay(dayofweek)
			.GetFirst();
	};

	this.GetNext = function (ferryline, departurepoint, dayofweek, hour, minute) {
		return this.GetSamband(ferryline)
			.GetRute(departurepoint)
			.GetDay(dayofweek)
			.GetNextDeparture(hour, minute);
	};

	this.RefreshServices = function () {
		console.log("[debug] coreFerjelista::RefreshServices() refreshing view");
		$("#lvMainview")
			.empty();
		var now = new Date();
		var str = GetDayName(now.getDay(),1) 
			+ " " + strpad(now.getHours(),2) 
			+ ":" + strpad(now.getMinutes(),2);

		$(".daycontents")
			.text(str);
		$(this.serviceList)
			.each(function (i) {
				var ferryline = this;
				var slink = $("<a />");
				slink.text(ferryline.Name)
					.attr("href", "#");

				$(ferryline.timeTableList)
					.each(function (j) {
						var location = this;
						var next = location.GetNextDeparture();
						var minstodep = parseInt(next.MinutesUntil(), 10);
						var cls;

						if(minstodep <= 5) {
							cls = "Red"
						} else if(minstodep <=
							30) {
							cls = "Green"
						} else {
							cls = "Orange"
						}
						var minutestodeptxt = $(
							"<span />")
							.text(next.HowLongUntil())
							.addClass("text" + cls)
							.addClass("textBold");
						var spacer = " - ";
						var string1 = "Neste fra " + location.from + " om ";

						var next2 = next.Next();
						var next3 = next2.Next();
						var next4 = next3.Next();
						var next5 = next4.Next();

						var string2 = next.Output() +
							spacer + next2.Output() +
							spacer + next3.Output() +
							spacer + next4.Output() +
							spacer + next5.Output();

						slink
							.append($("<p />")
								.append($("<strong />")
									.text(string1))
								.append(
									minutestodeptxt))
							.append($("<p />")
								.text(string2));
					});

				var listview1Row = $("<li />")
					.append(slink
						.click(function (e) {
							ferjelista.SelectService(ferryline);
						}) // click on page1
				); // listview1row
				$("#lvMainview")
					.append(listview1Row);
			}); // each servicelist
		$("#lvMainview")
			.listview("refresh");
	};

	this.SelectService = function (ferryline) {
		console.log("[debug] coreFerjelista::SelectService()");
		var pobj = this;
		$.mobile.changePage("#pageLocations", {transition: "none"});
		$("#lvLocations")
			.empty();
		var datefrom = new Date(ferryline.ValidFrom);
		var dateto = new Date(ferryline.ValidTo);
		var headerLvitem = $("<li />")
			.append($("<h1 />")
				.text(ferryline.Name))
			.append($("<p />")
				.text("Overfartstid: " +
					ferryline.TripTime +
					" minutter, takststone " +
					ferryline.PriceZone))
			.append($("<p />")
				.text("Rute gyldig fra " +
					datefrom.toNorwString() +
					" til " +
					dateto.toNorwString()));
		$("#lvLocations")
			.append(headerLvitem);

		// do functions for transition to page 2
		$(ferryline.timeTableList)
			.each(function (j) {
				var departurepoint = this;
				var litem = $("<li />")
					.append(
						$("<a />")
						.text("Fra " + departurepoint.from)
						.attr("href", "#")
						.click(function (e) {
							pobj.SelectDeparturepoint(departurepoint);
						}) //click
				) //append
				$("#lvLocations")
					.append(litem);
			});
		$("#lvLocations")
			.listview("refresh");
	};

	this.SelectDeparturepoint = function (departurepoint) {
		console.log("[debug] coreFerjelista::SelectDeparturepoint()");
		var pobj = this;
		$.mobile.changePage("#pageDays", {transition: "none"});
		$("#lvDays")
			.empty();
		$(departurepoint.departureDays)
			.each(function (k) {
				var weekday = this;
				var litem = $("<li />")
					.append(
						$("<a />")
						.text(GetDayName(weekday.DayOfWeek))
						.attr("href", "#")
						.click(function (e) {
							pobj.SelectDay(weekday);
						}) //click
				) //append
				$("#lvDays")
					.append(litem);
			});
		$("#lvDays")
			.listview("refresh");
	};

	this.SelectDay = function (weekday) {
		console.log("[debug] coreFerjelista::SelectDay()");
		$.mobile.changePage("#pageDepartures", {transition: "none"});
		$("#lvDepartures")
			.empty();
		$(weekday.Departures)
			.each(function (l) {
				var departure = this;
				var litem = $("<li />");
				var str = $("<strong>")
					.text(departure.TimeOfDay);
				litem.append(str);
				if(departure.Rute) {
					litem.append(" (Rute " + departure.Rute + ")");
				}
				if(departure.Comments) {
					litem.append(" (" + departure.Comments + ")");
				}
				$("#lvDepartures")
					.append(litem);
			}); //each departure
		$("#lvDepartures")
			.listview("refresh");
	};

};

/////////////////////////////// Init

var ferjeLista;

$(document)
	.ready(function (e) {
		
		// Set up page
		ferjelista = new coreFerjelista();
		ferjelista.Initialize();
		$("#btnRefresh")
			.click(function (f) {
				ferjelista.RefreshServices();
			});
		var strVCkey = "fl_refresh_count";
		var visits = localStorage.getItem(strVCkey);
		visits++;
		localStorage.setItem(strVCkey,visits);

		// Add refresh when showing main view
		$( "#pageMainview" )
			.on( "pagebeforeshow", function( event ) {
				ferjelista.RefreshServices();
			});
	});