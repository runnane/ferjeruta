/**
 * ferjeruta.no 
 * ferjeruta.js - main js code for init and minor functions
 * (c) 2014 Jon Tungland (jon@tungland.org) - http://runnane.no/
 * Released under the GNU General Public License 2.0
 * See gpl-2.0.txt
 *
 * Project page: https://github.com/runnane/ferjeruta
 *
 */

/**
 *
 * @param fm
 * @param fs
 * @param lm
 * @param ls
 * @returns {number}
 * @constructor
 */
var TimeBetweenTwoTimes = function(fm,	fs, lm, ls) {
	"use strict";
	var date1 = new Date(2000, 0, 1, fm, fs);
	var date2 = new Date(2000, 0, 1, lm, ls);
	if(date2 < date1) {
		date2.setDate(date2.getDate() + 1);
	}
	var diff = date2 - date1;
	return(diff / 60000);
};

/**
 *
 * @param secs
 * @returns {string}
 * @constructor
 */
var SecsToString = function(secs) {
	"use strict";
	var hours = Math.floor(secs / 60 / 60);
	secs -= hours * 60 * 60;
	var minutes = Math.floor(secs / 60);
	secs -= minutes * 60;
	var seconds = Math.floor(secs);
	return hours + " t, " + minutes + " m, " + seconds + " s";
};

/**
 *
 * @param minutes
 * @returns {string}
 * @constructor
 */
var MinsToString = function(minutes) {
	"use strict";
	var hours = Math.floor(minutes / 60);
	minutes -= hours * 60;
	if(hours >= 1) {
		return hours + ":" + strpad(minutes,2) + " min";
	} else {
		return minutes + " min";
	}
};

/**
 * Get weekday name by dayOfWeek int
 * @param dayOfWeek
 * @param isjsdate
 * @returns {any}
 * @constructor
 */
var GetDayName = function (dayOfWeek, isjsdate) {
	"use strict";
	var weekday = new Array(7);
	weekday[0] = "Søndag";
	weekday[1] = "Mandag";
	weekday[2] = "Tirsdag";
	weekday[3] = "Onsdag";
	weekday[4] = "Torsdag";
	weekday[5] = "Fredag";
	weekday[6] = "Lørdag";
	if(isjsdate != 1) {
		dayOfWeek--;
	}
	return weekday[dayOfWeek];
};

/**
 *
 * @param str
 * @param maxCharacters
 * @returns {string}
 */
var strpad = function (str, maxCharacters) {
	"use strict";
	var outStr = str.toString();
	return outStr.length < maxCharacters ? strpad("0" + outStr, maxCharacters) : outStr;
};

/**
 *
 * @param h1
 * @param m1
 * @param h2
 * @param m2
 * @returns {boolean}
 */
var isEarlier = function (h1, m1, h2, m2) {
	"use strict";
	if(h1 < h2 || (h1 == h2 && m1 < m2)) {
		return true;
	}
	return false;
};

/**
 * Extend internal date object
 * @returns {string}
 */
Date.prototype.toNorwString = function () {
	"use strict";
	return this.getDate() + "." + (this.getMonth() + 1) + "." + this.getFullYear();
};

/**
 * Helper function for creating headers, breadcrumbs etc
 * @param str
 * @param header
 * @returns {jQuery|HTMLElement|*|Promise<string>|string}
 * @constructor
 */
var CreateSimpleLi = function(str, header){
	"use strict";
	if(header == undefined){
		return $('<li />').text(str);
	}
	var li = $('<li />');
	li.append($('<h1 />').html(header));
	li.append($('<p />').html(str));
	return li
};

////// Start webpage

$.ajaxSetup({ cache: false });

var _fr;
var _paq = _paq || [];

_paq.push(["trackPageView"]);
_paq.push(["enableLinkTracking"]);

$(document)
	.ready(function (e) {
		"use strict";
		// Load main page if hash is set when loading page (cannot refresh inactive page)
		if(window.location.hash){
			$.mobile.changePage("#pageMainview", {transition: "none"});
		}
	
		// Set up page
		_fr = new coreFerjeruta();
		_fr.Initialize(true, function(){
			_fr.RefreshNotifications(function(success){
				var interval = setInterval(function(s){
					$.mobile.loading('hide');
					clearInterval(interval);
				},1);
			});
		});
		
		// Init route refresh button
		$("#btnRefresh")
			.click(function (f) {
				_fr.RefreshServices();
			});
			
		// Init notification refresh button
		$("#btnRefreshNotifications")
			.click(function (f) {
				_fr.RefreshNotifications();
			});
	
		// Add refresh when showing main page
		$( "#pageMainview" )
			.on( "pagebeforeshow", function( event ) {
				_fr.RefreshServices();
			});

		// Update count on settings page
		$( "#pageSettings" )
			.on( "pagebeforeshow", function( event ) {
				var HiddenServices = _fr.GetSetting("HiddenServices");
				var len = $.map(HiddenServices, function(n, i) { return i; }).length;
				if(len > 0 ){
					$("#btnResetHiddenServices").closest('.ui-btn').show();
					$("#btnResetHiddenServices").prop("value", "Gjennopprett " + len + " skjulte ruter");
					$("#btnResetHiddenServices").button("refresh");
				}else{
					$("#btnResetHiddenServices").closest('.ui-btn').hide();
				}
			});

		
		$("#btnResetHiddenServices").click(function(){
			_fr.ResetHiddenServices();
		});
		
		// Set hooks and default values to usersettings elements
		$.each(_fr.userSettings, function(settingName, settingOptions) {
			var el =  $("#s_" + settingName);
            el.change(function (f) {
				var val = (el.prop('checked') === true);
				_fr.SetSetting(settingName, val);
			});
			el.prop('checked', _fr.GetSetting(settingName)).checkboxradio('refresh');
        });
		
});
	
$(document).on('pagebeforecreate', '#pageMainview', function(){
	"use strict";
   var interval = setInterval(function(){
        $.mobile.loading('show', {
            text: 'Laster ferjeruta',
			textVisible: true,
			html: ""
		});
        clearInterval(interval);
    },1);  
});
