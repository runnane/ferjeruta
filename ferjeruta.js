/**
 * ferjeruta.no 
 * ferjeruta.js - main js code for init and minor functions
 * (c) 2014 Jon Tungland (jon@tungland.org)
 * Released under the GNU General Public License 2.0
 * See gpl-2.0.txt
 *
 * Project page: https://bitbucket.org/runnane/ferjeruta
 *
 */
 
////// Helper functions
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

var isEarlier = function (h1, m1, h2, m2) {
	if(h1 < h2 || (h1 == h2 && m1 < m2)) {
		return true;
	}
	return false;
};

// Extend internal date object
Date.prototype.toNorwString = function () {
	return this.getDate() + "." + (this.getMonth() + 1) + "." + this.getFullYear();
};

////// Start webpage
var ferjeRutaMainObject;
$(document)
	.ready(function (e) {
		
		// Load main page if hash is set when loading page (cannot refresh inactive page)
		if(window.location.hash){
			$.mobile.changePage("#pageMainview", {transition: "none"});
		}
	
		// Set up page
		ferjeRutaMainObject = new coreFerjeruta();
		ferjeRutaMainObject.Initialize();
		$("#btnRefresh")
			.click(function (f) {
				ferjeRutaMainObject.RefreshServices();
			});
	
		// Add refresh when showing main page
		$( "#pageMainview" )
			.on( "pagebeforeshow", function( event ) {
				ferjeRutaMainObject.RefreshServices();
			});
	});
