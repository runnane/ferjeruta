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

// Compare times
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

// Helper function for creating headers, breadcrumbs etc
var CreateSimpleLi = function(str, header){
	if(header == undefined){
		return $('<li />').text(str);
	}
	var li = $('<li />');
	li.append($('<h1 />').html(header));
	li.append($('<p />').html(str));
	return li
};

function comfirmDlg(text1, text2, button, callback) {
  $("#confirmdlg .qA").text(text1);
  $("#confirmdlg .qB").text(text2);
  $("#confirmdlg .btnA").text(button).unbind("click.confirm").on("click.confirm", function() {
    callback();
    $(this).off("click.confirm");
  });
  $.mobile.changePage("#confirmdlg");
}

////// Start webpage
var _fr;
var _paq = _paq || [];

_paq.push(["trackPageView"]);
_paq.push(["enableLinkTracking"]);

$(document)
	.ready(function (e) {
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
		
		// Embed Piwik loading code (only for production site)
		if(_fr.Settings.PiwikEnabled == 1){
			var u=(("https:" == document.location.protocol) ? "https" : "http") + "://projects.runnane.no/piwik/";
			_paq.push(["setTrackerUrl", u+"piwik.php"]);
			_paq.push(["setSiteId", "1"]);
			var d=document, g=d.createElement("script"), s=d.getElementsByTagName("script")[0]; g.type="text/javascript";
			g.defer=true; g.async=true; g.src=u+"piwik.js"; s.parentNode.insertBefore(g,s);
		}
	
		
});
	
$(document).on('pagebeforecreate', '#pageMainview', function(){     
   var interval = setInterval(function(){
        $.mobile.loading('show', {
            text: 'Laster ferjeruta',
			textVisible: true,
			html: ""
		});
        clearInterval(interval);
    },1);  
});
