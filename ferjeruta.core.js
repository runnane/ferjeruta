/**
 * ferjeruta.no 
 * ferjeruta.core.js - Core object for ferjeruta
 * (c) 2014 Jon Tungland (jon@tungland.org) - http://runnane.no/
 * Released under the GNU General Public License 2.0
 * See gpl-2.0.txt
 *
 * Project page: https://bitbucket.org/runnane/ferjeruta
 *
 **/

var coreFerjeruta = function () {
	this.serviceList = new Array();
	this.isLive = (location.pathname == "/");
	this.AutoRefreshInterval = 60*1000; // 60 sec
	// Settings
	this.userSettings = {
		"AutoRefresh" : { type:"bool", defValue: false, onChange: function(val){ if(val==true){ferjeRutaMainObject.StartAutoRefresh(ferjeRutaMainObject.AutoRefreshInterval);}} },
		"ShowRogaland" : { type:"bool", defValue: true },
		"ShowHordaland" : { type:"bool", defValue: true }
	};

	this.Log = function (str){
		// Don't debug if we are live on ferjeruta.no
		if(!this.isLive){
			console.log(str);	
		}
	}; //Log
	
	this.GetSetting = function(settingName){
		return $.jStorage.get(settingName, this.userSettings[settingName].defValue);
	};
	this.SetSetting = function(settingName,value){
		return $.jStorage.set(settingName, value);
	};
	
	this.StartAutoRefresh = function(interval){
		this.AutoRefreshProcId = setInterval(function(){ ferjeRutaMainObject.AutoRefreshTimer(interval); }, interval);
		return this.AutoRefreshProcId;
	}
	this.StopAutoRefresh = function(){
		clearInterval(this.AutoRefreshProcId);
		this.AutoRefreshProcId=0;
	}

	
	this.AutoRefreshTimer = function(timeoutval){
		this.Log("[debug] coreFerjeruta::AutoRefreshTimer() spawning, id="+this.AutoRefreshProcId);
		var id = this.AutoRefreshProcId;
		if(!this.GetSetting("AutoRefresh")){
			this.Log("[debug] coreFerjeruta::AutoRefreshTimer() stopping interval due to autorefresh disabled");
			this.StopAutoRefresh();
			return;
		}
		if(this.AutoRefreshProcId<1){
			this.Log("[debug] coreFerjeruta::AutoRefreshTimer() stopping interval due to unknown procid");
			this.StopAutoRefresh();
			return;
		}
		if( $('#pageMainview').is(':hidden') ) {
			this.Log("[debug] coreFerjeruta::AutoRefreshTimer() not spawning refresh, due to mainpanel not being active");
			return;
		}
		this.Log("[debug] coreFerjeruta::AutoRefreshTimer() spawning refresh");
		this.RefreshServices();
	}
	
	this.Initialize = function (refreshwhendone) {
		var pobj = this;
		this.Log("[debug] coreFerjeruta::Initialize() starting");
		$.get("routes.xml", function (xml) {
			pobj.Log("[debug] coreFerjeruta::Initialize() got xml");
			$("route", xml)
				.each(function (i) {
					var service = pobj.AddSamband(this);
					$("departurepoint", this)
						.each(function (j) {
							var dp = service.AddDeparturePoint(this);
							$("weekday", this)
								.each(function (k) {
									var weekdays = $(this).attr("day");
									$("departure",this)
										.each(function (l) {
												dp.AddAvgang(weekdays, this);
											});// each departure
								});// each weekday
						}); //each departurepoint
				}); // each route
			pobj.Log("[debug] coreFerjeruta::Initialize() route table views populated");
			if(refreshwhendone == true){
				pobj.RefreshServices();
			}
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
		this.Log("[debug] coreFerjeruta::RefreshServices() refreshing view");
		$("#lvMainview")
			.empty();
		var pobj = this;
		var now = new Date();
		var str = GetDayName(now.getDay(),1) 
			+ " " + strpad(now.getHours(),2) 
			+ ":" + strpad(now.getMinutes(),2);
		this.Today = now.getDay()+1;

		var show = {
			"Rogaland": this.GetSetting("ShowRogaland"),
			"Hordaland": this.GetSetting("ShowHordaland")
			};

		$(".daycontents")
			.text(str);
		var numberShown = 0;
		$(this.serviceList)
			.each(function (i) {
				var ferryline = this;
				if(show[ferryline.AreaCode]){
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
					numberShown++;
				} // if show ferryline
			}); // each servicelist
		if(numberShown == 0){
			$("#lvMainview")
				.append(CreateSimpleLi("Har du fjernet alle i innstillinger under?","Ingen ruter aktive :'("));
		}
		$("#lvMainview")
			.listview("refresh");
	};

	this.SelectService = function (ferryline) {
		this.Log("[debug] coreFerjeruta::SelectService()");
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
		this.Log("[debug] coreFerjeruta::SelectDeparturepoint()");
		var pobj = this;
		$.mobile.changePage("#pageDays", {transition: "none"});
		$("#lvDays")
			.empty();
		$("#lvDays").append(CreateSimpleLi(" fra " + departurepoint.Name, departurepoint.ParentService.Name));
		$(departurepoint.DepartureDays)
			.each(function (k) {
				var weekday = this;
				var daylink = $("<a />")
						.text(GetDayName(weekday.DayOfWeek))
						.attr("href", "#")
						.click(function (e) {
							pobj.SelectDay(weekday);
						}); //click
				if(weekday.DayOfWeek == pobj.Today){
					daylink.addClass("textOrange")
				}
				var litem = $("<li />")
					.append(daylink);
				$("#lvDays")
					.append(litem);
			});
			
		$("#lvDays")
			.listview("refresh");
	};

	this.SelectDay = function (weekday) {
		this.Log("[debug] coreFerjeruta::SelectDay()");
		var pobj = this;
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
			
		// Bottom back/next navbar
		var navbar = $('<div />');
		var ul = $('<ul />');
		
		navbar.append(ul
			.append($('<li />')
				.append($('<a />')
					.attr('href','#')
					.text('< ' + weekday
						.PreviousDay()
						.DayName())
					.click(function(e){ 
						pobj.SelectDay( weekday.PreviousDay()); 
					})
				)));
				
		navbar.append(ul
			.append($('<li />')
				.append($('<a />')
					.attr('href','#')
					.text(weekday
						.NextDay()
						.DayName() + ' >')
					.click(function(e){ 
						pobj.SelectDay( weekday.NextDay()); 
					})
				)));
		
		$("#lvDepartures").append($('<li />').append(navbar.navbar()));
		
		$("#lvDepartures")
			.listview("refresh");
		$(window).scrollTop( 0 );
	};
};