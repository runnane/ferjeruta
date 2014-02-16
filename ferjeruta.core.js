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
	// Number of notifications to show
	this.serviceList = new Array();
	this.isLive = (location.hostname == "ferjeruta.no" || location.hostname == "www.ferjeruta.no");
	var pobj = this;
	this.RouteXMLSerial = 0;
	this.LastNotificationSerial = 0;
	this.Notifications = new Array();
	
	this.Settings = { 
		"NotificationLimit"	: 10
	};
	
	this.AutoRefreshData = {
			"Routes": {
					Interval	: 60*1000, // 60 sec
					ProcId		: 0,
					onTimer : function(){
							pobj.Log("[debug] coreFerjeruta::onTimer(Routes) firing");
							if( $('#pageMainview').is(':hidden') ) {
								pobj.Log("[debug] coreFerjeruta::onTimer(Routes) aborting, due to mainpanel not being active");
								return;
							}
							pobj.RefreshServices();
						}
				},
			"Notifications": {
					Interval	: 5*60*1000, // 5 min
					ProcId		: 0,
					onTimer 	: function(){
							pobj.Log("[debug] coreFerjeruta::onTimer(Notifications) firing");
							pobj.RefreshNotifications();
						}
				}
		
		};
	
	// Settings object w/ defaults 
	this.userSettings = {
		"AutoRefreshRoutes" : { type:"bool", defValue: false, 
			onChange: function(val){ 
				if(val==true){
					ferjeRutaMainObject.StartAutoRefresh("Routes"); 
				}else{
					ferjeRutaMainObject.StopAutoRefresh("Routes");	
				}
			} 
		},
		"AutoRefreshNotifications" : { type:"bool", defValue: false, 
			onChange: function(val){ 
				if(val==true){
					ferjeRutaMainObject.StartAutoRefresh("Notifications"); 
				}else{
					ferjeRutaMainObject.StopAutoRefresh("Notifications");	
				}
			} 
		},
		"ShowRogaland" : { type:"bool", defValue: true },
		"ShowHordaland" : { type:"bool", defValue: true },
		"ShowTimeOfArrival" : { type:"bool", defValue: false },
		"HiddenServices" : { type:"obj", defValue: {} }
	};

	// Setting related functions
	this.GetSetting = function(settingName){
		return $.jStorage.get(settingName, this.userSettings[settingName].defValue);
	};
	
	this.SetSetting = function(settingName, value){
		// Only set if different to previous value
		var origval = this.GetSetting(settingName);
		if(origval != value){
			if(this.userSettings[settingName].onChange != undefined){
				this.userSettings[settingName].onChange(value);
			}	
		}
		return $.jStorage.set(settingName, value);
	};
	
	// AutoRefreshRoutes handlers
	this.StartAutoRefresh = function(subname, interval){
		if(subname == undefined){
			subname = "Routes";
		}
		if(interval == undefined){
			interval = this.AutoRefreshData[subname].Interval;
		}
		this.Log("[debug] coreFerjeruta::StartAutoRefresh("+subname+") starting");
		if(this.AutoRefreshData[subname].ProcId == 0){
			this.Log("[debug] coreFerjeruta::StartAutoRefres("+subname+") spawning new timer");
			this.AutoRefreshData[subname].ProcId = setInterval(function(){ ferjeRutaMainObject.AutoRefreshTimer(subname,interval); }, interval);
		}else{
			this.Log("[debug] coreFerjeruta::StartAutoRefresh("+subname+") timer already started ("+this.AutoRefreshData[subname].ProcId+")");
		}
		return this.AutoRefreshData[subname].ProcId;
	}
	
	this.StopAutoRefresh = function(subname){
		this.Log("[debug] coreFerjeruta::StopAutoRefresh("+subname+") starting");
		if(this.AutoRefreshData[subname].ProcId != 0){
			this.Log("[debug] coreFerjeruta::StopAutoRefresh("+subname+") killing timer ("+this.AutoRefreshData[subname].ProcId+")");
			clearInterval(this.AutoRefreshData[subname].ProcId);
			this.AutoRefreshData[subname].ProcId=0;
		}else{
			this.Log("[debug] coreFerjeruta::StopAutoRefresh("+subname+") failed, empty autorefresh proc id");
		}
	}
	
	this.AutoRefreshTimer = function(subname, timeoutval){
		this.Log("[debug] coreFerjeruta::AutoRefreshTimer("+subname+") spawning, id="+this.AutoRefreshData[subname].ProcId);
		var id = this.AutoRefreshData[subname].ProcId;
		if(!this.GetSetting("AutoRefresh"+subname)){
			this.Log("[debug] coreFerjeruta::AutoRefreshTimer("+subname+") stopping interval due to autorefresh disabled");
			this.StopAutoRefresh(subname);
			return;
		}
		if(this.AutoRefreshData[subname].ProcId<1){
			this.Log("[debug] coreFerjeruta::AutoRefreshTimer("+subname+") stopping interval due to unknown procid");
			this.StopAutoRefresh(subname);
			return;
		}
		this.Log("[debug] coreFerjeruta::AutoRefreshTimer("+subname+") spawning onTimer()");
		this.AutoRefreshData[subname].onTimer();
	}
	
	// Logging (for debug)
	this.Log = function (str){
		// Don't debug if we are live on ferjeruta.no
		if(!this.isLive){
			console.log(str);	
		}
	}; //Log
	
	// Main init operation
	this.Initialize = function (refreshWhenDone, onCompleteFunction) {
		var pobj = this;
		this.Log("[debug] coreFerjeruta::Initialize() starting");
		$.get("schedule.xml", function (xml) {
			pobj.Log("[debug] coreFerjeruta::Initialize() got xml");
			
			pobj.RouteXMLSerial = $("routes", xml).attr("serial");
			$("route", xml)
				.each(function (i) {
					var service = pobj.AddSamband(this);
					$("flag", $(this)).each(function (i) {
						service.AddFlag(this);
					});
					$("line", $(this)).each(function (i) {
						service.AddLine(this);
					});
					
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
			
			// Check if we want AutoRefreshRoutes and setInterval
			if(pobj.GetSetting("AutoRefreshRoutes") == true){
				pobj.StartAutoRefresh("Routes");
			}
			
			// Check if we want AutoRefreshNotifications and setInterval
			if(pobj.GetSetting("AutoRefreshNotifications") == true){
				pobj.StartAutoRefresh("Notifications");
			}
			
			// Refresh
			if(refreshWhenDone == true){
				pobj.RefreshServices();
			}
			
			$("#txtScheduleVersion").html(pobj.RouteXMLSerial);
			
			if(onCompleteFunction != undefined){
				onCompleteFunction();	
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

	// Get updated notifications from rVarsel subsystem
	this.RefreshNotifications = function(oncomplete){
		var pobj = this;
		this.Log("[debug] coreFerjeruta::RefreshNotifications() triggering with serial " + pobj.LastNotificationSerial);
		$.ajax({
			type: "POST",
			url: "http://projects.runnane.no/rVarsel/poll.php",
			data: {ls : pobj.LastNotificationSerial},
			success: function (data, textStatus, jqXHR) {
				pobj.LastNotificationSerial = data.currentserial;
				if(data.messages.length>0){
					pobj.Log("[debug] coreFerjeruta::RefreshNotifications() got new messages: " + data.messages.length);
					pobj.Notifications = new Array().concat(data.messages, pobj.Notifications);
					while(pobj.Notifications.length > pobj.Settings.NotificationLimit){
						pobj.Notifications.pop();	
					}
					pobj.RedrawNotifications();
					if(oncomplete != undefined){
						oncomplete(true);
					}
				}else{
					pobj.Log("[debug] coreFerjeruta::RefreshNotifications() no new messages");
				}
			},
			error: function(jqXHR, textStatus, errorThrown){
				// Todo: handle unable to fetch notifications (no service etc..)
				if(oncomplete != undefined){
					oncomplete(false);
				}
			},
			dataType: "json"
		});
	};
	
	// Redraw notifications from internal object
	this.RedrawNotifications = function(){
		$("#notificationContainer")
			.empty();
		var pobj = this;
		$.each(pobj.Notifications, function(index, notice){
			var notification = notice.message;
			if(notice.title){
				notification = "<strong>" + notice.title + "</strong>" + "<br />" + notification;
			}
			var timenow = MakeDateFromDateTime(notice.time);
			var timestr = timenow.getDate() + "." + (timenow.getMonth()+1) + " " + strpad(timenow.getHours(),2) + ":" + strpad(timenow.getMinutes(),2);
			$("#notificationContainer")
				.append(
					$("<div />")
				.append($("<h2 />").text(timestr + " " + notice.service.name))
				.append($("<p />").html(notification))
				.collapsible({ inset: false })
			);
		});
	}

	this.ResetHiddenServices = function(){
		ferjeRutaMainObject.SetSetting("HiddenServices", {});
		$.mobile.changePage("#pageMainview", {transition: "none"});
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
		var HiddenServices = ferjeRutaMainObject.GetSetting("HiddenServices");

		$(".daycontents")
			.text(str);
		var numberShown = 0;
		$(this.serviceList)
			.each(function (i) {
				var ferryline = this;
				// Specific area hidden by setting
				if(HiddenServices[ferryline.Name] != undefined){
					return true;	
				}
				
				// Entire area hidden by option
				if(!show[ferryline.AreaCode]){
					return true;	
				}
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
			}); // each servicelist
		if(numberShown == 0){
			$("#lvMainview")
				.append(CreateSimpleLi("Har du fjernet alle i innstillinger under?","Ingen ruter aktive :'("));
		}
		$("#lvMainview")
			.listview("refresh");
	};

	this.SelectService = function (service) {
		this.Log("[debug] coreFerjeruta::SelectService()");
		var pobj = this;
		$.mobile.changePage("#pageLocations", {transition: "none"});
		$("#lvLocations")
			.empty();
		var datefrom = new Date(service.ValidFrom);
		var dateto = new Date(service.ValidTo);
					
		var headerLvitem = $("<li />")
			.append($("<h1 />")
				.text(service.Name))
			.append($("<p />")
				.text("Overfartstid: " +
					service.TripTime +
					" minutter, takststone " +
					service.PriceZone))
			.append($("<p />")
				.text("Rute gyldig fra " +
					datefrom.toNorwString() +
					" til " +
					dateto.toNorwString()));
			if(service.Comments != undefined && service.Comments.length > 0){
				headerLvitem
					.append($("<p />")
						.text(service.Comments));
			}
		
		// link to pdf			
		if(service.Url){
			var pdflink = $("<span />")
				.addClass("ui-li-aside")
				.addClass("fl-custom-image-dl")
				.click(function(e) {
					window.location=service.Url;
				});
			headerLvitem.append(pdflink);
		}
		$("#lvLocations")
			.append(headerLvitem);

		// do functions for transition to page 2
		$(service.DeparturePoints)
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
				); //append
				$("#lvLocations")
					.append(litem);
			});
		
			/*
			$("#lvLocations")
				.append($("<li />")
					.append(
						$("<a />")
						.text("Sjul " + service.Name)
						.attr("href", "#")
						.click(function (e) {
							service.Hide();
						}) //click
				));
			*/
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
		
		$("#lvDepartures").append(CreateSimpleLi(" fra " + weekday.ParentDeparturePoint.Name + ", " + GetDayName(weekday.DayOfWeek).toLowerCase() + "<br />Se forklaring til fotnoter under.", weekday.ParentDeparturePoint.ParentService.Name ));
		
		// Back/next navbar
		var bfbuttons = $('<li />')
			.addClass("ui-body ui-body-b")
			.append(
				$("<fieldset />")
					.addClass("ui-grid-a")
					.append(
						$("<div />")
							.addClass("ui-block-a")
							.append(
								$("<button />")
									.addClass("ui-btn ui-corner-all ui-btn-a ui-mini")
									.text('< ' + weekday.PreviousDay().DayName())
									.click(function(e) { 
										pobj.SelectDay( weekday.PreviousDay() ); 
									})
							)
					)
					.append(
						$("<div />")
							.addClass("ui-block-b")
							.append(
								$("<button />")
									.addClass("ui-btn ui-corner-all ui-btn-a ui-mini")
									.text(weekday.NextDay().DayName() + ' >')
									.click(function(e) { 
										pobj.SelectDay( weekday.NextDay() ); 
									})
							)
					)
			);
			
		$("#lvDepartures")
			.append(bfbuttons);
		
		$(weekday.Departures)
			.each(function (l) {
				var departure = this;
				var litem = $("<li />");
				var str = $("<strong>")
					.text(departure.TimeOfDay);
					
				if(departure.Line && departure.Line.Color){
					str.css("color",departure.Line.Color);
				}
				litem.append(str);
				
				// Show time of arrival if we have this setting enabled
				if(pobj.GetSetting('ShowTimeOfArrival') == true){
					var tript = departure.ParentDay.ParentDeparturePoint.ParentService.TripTime;
					if(tript != undefined && tript != ""){
						// TODO: this needs to be un-hacked. Use UTC??
						var timestr = "2010-01-01T" + departure.TimeOfDay + ":00"; // this is 1 hr off
						var deptime = new Date(timestr);
						var arrivaltime = new Date(deptime.getTime() - (60*60000) + (tript * 60000));
						//litem.append($("<div />").addClass("ui-icon-location").addClass("ui-btn-icon-notext").css("display","inline"));
						litem.append($("<span />")
							.addClass("fl-custom-image-arrival")
							.text(strpad(arrivaltime.getHours(),2) + ":" + strpad(arrivaltime.getMinutes(),2))
						);
					}
				}		
						
				if(departure.Line) {
					litem.append(" [");
					litem.append($("<strong />").text(departure.Line.Id));
					litem.append("] ");
				}
				var flags = 0;
				$.each(departure.Flags, function(idx, val){
					if(this.Code == undefined){
						return false;	
					}
					flags++;
					litem.append(" " + this.Code + " ");
				});
				
				if(departure.Line){
					$.each(departure.Line.Flags, function(idx, val){
						if(this.Code == undefined){
							return false;	
						}
						flags++;
						litem.append(" " + this.Code + " ");
					});
				}
				
				if(departure.Comments != undefined) {
					if(flags > 0){
						litem.append(" // ");
					}
					litem.append(" " + departure.Comments + " ");
				}
				if(departure.Line && departure.Line.Comments) {
					litem.append(" " + departure.Line.Comments + " ");
				}
				
				$("#lvDepartures")
					.append(litem);
					
			}); //each departure
		
		// flags
		var flagtext = "<h1>Fotnoter</h1>";
		$.each(weekday.ParentDeparturePoint.ParentService.ServiceFlags, function(idx, val){
			if(this.Code == undefined){
				return false;	
			}
			flagtext += " " + this.Code + "=" + this.Comments + "<br />";
		});
		$("#lvDepartures").append($('<li />').html(flagtext));
		// lines
		var ferrytext = "<h1>Ferjer</h1>";
		$.each(weekday.ParentDeparturePoint.ParentService.ServiceLines, function(idx, val){
			if(this.Id == undefined){
				return false;	
			}
			ferrytext += " " + this.Id + " = " + this.Name + "<br />";
		});
		$("#lvDepartures").append($('<li />').html(ferrytext));

		// CLone the top navbar and add to bottom
		$("#lvDepartures").append(bfbuttons.clone(true));
		
		$("#lvDepartures")
			.listview("refresh");
		$(window).scrollTop( 0 );
	};
};
