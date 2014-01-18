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


var coreFerjeruta = function () {
	this.serviceList = new Array();
	this.isLive=(location.pathname == "/");

	this.Log = function (str){
		// Don't debug if we are live on ferjeruta.no
		if(!this.isLive){
			console.log(str);	
		}
	}; //Log


	this.Initialize = function () {
		ferjeRutaMainObject.Log("[debug] coreFerjeruta::Initialize() starting");
		var pobj = this;
		$.get("routes.xml", function (xml) {
			ferjeRutaMainObject.Log("[debug] coreFerjeruta::Initialize() got xml");
			$("route", xml)
				.each(function (i) {
					var service = pobj.AddSamband(this);
					$("departurepoint", this)
						.each(function (j) {
							var departurepoint = $(this).attr("location");
							service.AddDeparturePoint(this);
							$("weekday", this)
								.each(function (k) {
									var weekdays = $(this).attr("day");
									$("departure",this)
										.each(function (l) {
												service
													.GetDeparturePoint(departurepoint)
													.AddAvgang(weekdays, this);
											});
								});
						});
					//return false;
				}); // each route
			ferjeRutaMainObject.Log("[debug] coreFerjeruta::Initialize() route table views populated");
			pobj.RefreshServices();
		}); // http get
	}; // Initialize

	this.AddSamband = function (sambandXmlNode) {
		var fr = new FerryService(sambandXmlNode);
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

	this.GetNext = function (ferryline, departurepoint, dayofweek, hour, minute) {
		return this.GetSamband(ferryline)
			.GetDeparturePoint(departurepoint)
			.GetDay(dayofweek)
			.GetNextDeparture(hour, minute);
	};

	this.RefreshServices = function () {
		ferjeRutaMainObject.Log("[debug] coreFerjeruta::RefreshServices() refreshing view");
		$("#lvMainview")
			.empty();
		var pobj = this;
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

				$(ferryline.DeparturePoints)
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
							pobj.SelectService(ferryline);
						}) // click on page1
				); // listview1row
				$("#lvMainview")
					.append(listview1Row);
			}); // each servicelist
			
		$("#lvMainview")
			.listview("refresh");
	};

	this.SelectService = function (ferryline) {
		ferjeRutaMainObject.Log("[debug] coreFerjeruta::SelectService()");
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
		$(ferryline.DeparturePoints)
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
		ferjeRutaMainObject.Log("[debug] coreFerjeruta::SelectDeparturepoint()");
		var pobj = this;
		$.mobile.changePage("#pageDays", {transition: "none"});
		$("#lvDays")
			.empty();
		$("#lvDays").append(CreateSimpleLi(" fra " + departurepoint.Name, departurepoint.ParentService.Name));
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
		ferjeRutaMainObject.Log("[debug] coreFerjeruta::SelectDay()");
		$.mobile.changePage("#pageDepartures", {transition: "none"});
		$("#lvDepartures")
			.empty();
		
		$("#lvDepartures").append(CreateSimpleLi(" fra " + weekday.ParentDeparturePoint.Name + ", " + GetDayName(weekday.DayOfWeek).toLowerCase(), weekday.ParentDeparturePoint.ParentService.Name));
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
