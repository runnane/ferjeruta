/**
 * ferjeruta.no 
 * ferjeruta.core.js - Core object for ferjeruta
 * (c) 2014 Jon Tungland (jon@tungland.org)
 * Released under the GNU General Public License 2.0
 * See gpl-2.0.txt
 *
 * Project page: https://bitbucket.org/runnane/ferjeruta
 *
 **/

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
						var string1 = "Neste fra " + location.Name + " om ";

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
						.text("Fra " + departurepoint.Name)
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
		$(departurepoint.DepartureDays)
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
