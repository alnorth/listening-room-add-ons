var pDiv = document.createElement("div");
pDiv.setAttribute("onclick", "return window;");
p = pDiv.onclick();

var $ = p.$;
var settings;
var storedTrackInfo = {};
var recordsWithArtInCss = {};
var initialChatMessagesProcessed = false;

////////////////////////////Enums
		
var lastfmStatus = {
	SCROBBLING_DISABLED: -1,
	UNSENT: 0,
	PLAYING_SENT: 1,
	WAITING_FOR_SCROBBLING: 2,
	SCROBBLED: 3
}

////////////////////////////

function urlEncodeCharacter(c) {
	return '%' + c.charCodeAt(0).toString(16);
}

function urlEncode(s) {
    return encodeURIComponent( s ).replace( /\%20/g, '+' ).replace( /[!'()*~]/g, urlEncodeCharacter );
}

function getTrackStartTimestamp(trackId) {
	var timestamp = null;
	for(var i = p.room.history.length - 1; i >= 0; i--) {
		var h = p.room.history[i];
		if(h.event == "trackStart" && h.data == trackId) {
			timestamp = h.timestamp;
		}
	}
	if(timestamp == null) {
		timestamp = (new Date()).getTime();
	}
	return timestamp;
}

function loadSpinsData() {
	if(settings.senddata) {
		var url = "/room/"+ p.room.id +"/spins.json";
		var process = function(data) {
			var i = 50;
			while(data.length > 0 && i > 0) {
				addTrackToDB(data.shift(), false);
				i--;
			}
			if(i == 0) {
				setTimeout(function() {process(data);}, 0);
			}
		};
		
		$.getJSON(url, process);
	}
}

function addTrackToDBByID(id) {
	var track = p.room.tracks[id];
	addTrackToDB(track, true);
}

function addTrackToDB(track, displayed) {
	var user = p.room.normalizedUsersById[track.userId];
	var trackData = {
		id: track.id,
		userId: track.userId,
		room: p.room.id,
		timestamp: track.startTime || getTrackStartTimestamp(track.id),
		reportedByUser: p.room.user.name,
		reportedByUserId: p.room.user.id
	};
	if(user != undefined) {
		trackData.user = user.name;
	}
	if(track.metadata.artist != undefined && track.metadata.title != undefined) {
		trackData.title = track.metadata.title;
		trackData.artist = track.metadata.artist;
		if(track.metadata.album != undefined) {
			trackData.album = track.metadata.album;
		}
	}
	if(track.upload) {
		trackData.filename = track.upload.originalFilename;
	}
	chrome.extension.sendRequest({type: "addtracktodb", track: trackData, isCurrent: (track.id == p.room.nowPlaying), displayed: displayed}, function(response) {
		//Once it's been added to the DB we get the data back again to load into our cache.
		if(displayed) {
			fetchTrackInfo(track.id);
		}
	});
}

function showDimmer(closeFunction) {
	$("#addons_lightbox_dimmer").show();
	if(closeFunction) {
		$("#addons_lightbox_dimmer").click(closeFunction);
	}
	$("body").css("overflow", "hidden");
}

function hideDimmer() {
	$("#addons_lightbox_dimmer").hide();
	$("#addons_lightbox_dimmer").unbind('click');
	$("body").css("overflow", "");
}

function showSettings() {
	showDimmer(hideSettings);
	$("#addons_settings_div").height($(p).height() - 220);
	$("#addons_settings").show();
}

function hideSettings() {
	hideDimmer();
	$("#addons_settings").hide();
}

function saveSettings() {
	settings = {};
	settings.hidechat = document.getElementById("addons_settings_hidechat").checked;
	settings.showuploader = document.getElementById("addons_settings_showuploader").checked;
	settings.albumart = document.getElementById("addons_settings_albumart").checked;
	settings.twitterusernamelinks = document.getElementById("addons_settings_twitterusernamelinks").checked;
	settings.showchattimestamps = document.getElementById("addons_settings_showchattimestamps").checked;
	
	settings.senddata = document.getElementById("addons_settings_senddata").checked;
			
	settings.scrobble = document.getElementById("addons_settings_scrobble").checked;
	settings.showscrobblestatus = document.getElementById("addons_settings_showscrobblestatus").checked;
	settings.lastfmlink = document.getElementById("addons_settings_lastfmlink").checked;
	settings.showlastfmlovebutton = document.getElementById("addons_settings_showlastfmlovebutton").checked;
	
	chrome.extension.sendRequest({type: "savesettings", settings:settings}, function(response) {});
	hideSettings();
	updateAllTrackData();
	applyChatHidden();
	removeRecordImagesIfNecessary();
	removeTwitterLinksIfNecessary();
	removeChatTimestampsIfNecessary();
}

function loadSettings() {
	chrome.extension.sendRequest({type: "getsettings"}, function(newSettings) {
		document.getElementById("addons_settings_hidechat").checked = newSettings.hidechat;
		document.getElementById("addons_settings_showuploader").checked = newSettings.showuploader;
		document.getElementById("addons_settings_albumart").checked = newSettings.albumart;
		document.getElementById("addons_settings_twitterusernamelinks").checked = newSettings.twitterusernamelinks;
		document.getElementById("addons_settings_showchattimestamps").checked = newSettings.showchattimestamps;
		
		document.getElementById("addons_settings_senddata").checked = newSettings.senddata;
		
		document.getElementById("addons_settings_scrobble").checked = newSettings.scrobble;
		document.getElementById("addons_settings_showscrobblestatus").checked = newSettings.showscrobblestatus;
		document.getElementById("addons_settings_lastfmlink").checked = newSettings.lastfmlink;
		document.getElementById("addons_settings_showlastfmlovebutton").checked = newSettings.showlastfmlovebutton;
		
		settings = newSettings;
		applyChatHidden();
	});
}

function showChangelog() {
	showDimmer(hideChangelog);
	$("#addons_changelog_div").height($(p).height() - 220);
	$("#addons_changelog").show();
}

function hideChangelog() {
	hideDimmer();
	$("#addons_changelog").hide();
}

// The log in box is different from other pop ups. Clicking outside this box should not cancel it.
function showLastFmLogin() {
	showDimmer();
	$("#addons_lastfmlogin").show();
}

function hideLastFmLogin() {
	hideDimmer();
	$("#addons_lastfmlogin").hide();
}

function sendLastFmLogin() {
	var login = {};
	login.username = $("#addons_lastfm_username").val();
	login.password = $("#addons_lastfm_password").val();
	$("#addons_lastfm_password").val("");
	chrome.extension.sendRequest({type: "lastfmlogin", login:login}, function(response) {});
	hideLastFmLogin();
}

function dontDoLastFmLogin() {
	settings.scrobble = false;
	document.getElementById("addons_settings_scrobble").checked = false;
	settings.showlastfmlovebutton = false;
	document.getElementById("addons_settings_showlastfmlovebutton").checked = false;
	
	chrome.extension.sendRequest({type: "savesettings", settings:settings}, function(response) {});
	updateAllTrackData();
	hideLastFmLogin();
}

function showCharts() {
	showDimmer(hideCharts);
	$("#addons_charts_div").height($(p).height() - 220);
	$("#addons_charts").show();
}

function hideCharts() {
	hideDimmer();
	$("#addons_charts").hide();
}

function processMessage(request, sender, sendResponse) {
	if(request.type == "lastfmloginneeded") {
		if(request.lastfmUsername && $("#addons_lastfm_username").val() == "") {
			$("#addons_lastfm_username").val(request.lastfmUsername);
		}
		showLastFmLogin();
		sendResponse({});
	} else if(request.type = "updatedtrackinfo") {
		updatedTrackInfo(request.id, request.info);
		sendResponse({});
	}
}

function checkForNewTracks() {
	$("div.recordWithDescription").filter(function() {
		// We filter out all the records with descriptions, or ones that are currently uploading.
		// For uploading tracks the description div is refreshed so quickly that our additions will
		// just flicker for a fraction of a second. We'll display them once the upload has finished.
		return $(this).find("div.addons_trackdata, div.progress").length === 0;
	}).each(function() {
		var trackId = this.id.replace("record-", "");
		
		var dataDiv = "<div id=\"addons_trackdata_"+ trackId +"\" class=\"addons_trackdata\"></div>";
		$(this).find("div.description").append(dataDiv);
		
		addTrackToDBByID(trackId);
	});
}

function buttonHtml(url, imagename, titleText) {
	return '<a href="'+ url +'" target="_blank"><img style="border: 0px;" src="'+ imagename +'" title="'+ titleText +'"/></a>';
}

function resizedImage(width, url) {
	return "http://resizer.co?w="+ width +"&img=" + urlEncode(url);
}

function fetchTrackInfo(trackId) {
	chrome.extension.sendRequest({type: "gettrackinfo", id:trackId}, function(response) {
		if(response != undefined) {
			updatedTrackInfo(trackId, response);
		}
	});
}

function updatedTrackInfo(trackId, info) {
	storedTrackInfo[trackId] = info;
	updateSingleTrackData(trackId);
}

function updateAllTrackData() {
	$("div.addons_trackdata").each(function(index) {
		var trackId = this.id.replace("addons_trackdata_", "");
		updateSingleTrackData(trackId, $(this));
	});
}

function updateSingleTrackData(trackId, el) {
	if(!el) {
		el = $("div#addons_trackdata_"+ trackId);
	}
	var track = p.room.tracks[trackId];
	var trackDataHtml = "";
	
	var trackInfo = storedTrackInfo[trackId];
	if(trackInfo) {
		if(trackInfo.albumArt && trackInfo.albumArt != "none") {
			setRecordImage(trackId, resizedImage(190, trackInfo.albumArt));
		}
		if(settings.showuploader) {
			var user = trackInfo.user;
			if(user != undefined && user != "") {
				if(settings.twitterusernamelinks) {
					var twitterUrl = "http://www.twitter.com/"+ user;
					trackDataHtml += '<div class="addons_uploader">Uploaded by <span class="username addons_twitter_username" data-username="'+ user +'"><a href="'+ twitterUrl +'" target="_blank">'+ user +'</a></span></div>';
				} else {
					trackDataHtml += '<div class="addons_uploader">Uploaded by <span class="username">'+ user +'</span></div>';
				}
			} else {
				trackDataHtml += '<div class="addons_uploader">Uploader has now left the room</div>';
			}
		}
		trackDataHtml += '<div class="addons_track_links">';
		if(settings.lastfmlink && trackInfo.lastfmurl && trackInfo.lastfmurl != "none") {
			trackDataHtml += buttonHtml(trackInfo.lastfmurl, chrome.extension.getURL("lastfm_button.png"), "See this track on Last.fm.");
		}
		if(settings.showscrobblestatus && trackInfo.lastfmstatus) {
			var imagePath = "";
			var titleText = "";
			if(trackInfo.lastfmstatus == lastfmStatus.UNSENT || trackInfo.lastfmstatus == lastfmStatus.PLAYING_SENT || trackInfo.lastfmstatus == lastfmStatus.WAITING_FOR_SCROBBLING) {
				imagePath = "notscrobbled.png";
				titleText = "This track has not been scrobbled yet. This will usually happen when the track finishes playing."
			} else if(trackInfo.lastfmstatus == lastfmStatus.SCROBBLED) {
				imagePath = "scrobbled.png";
				titleText = "This track has been scrobbled."
			}
			if(imagePath != "") {
				trackDataHtml += '<img style="border: 0px;" src="'+ chrome.extension.getURL(imagePath) +'" title="'+ titleText +'"/>'
			}
		}
		if(settings.showlastfmlovebutton && !trackInfo.lastfmloved && track.metadata.title) {
			trackDataHtml += '<a href="javascript:void(0);" class="addons_lastfm_lovebutton"><img style="border: 0px;" src="'+ chrome.extension.getURL("lovebutton.png") +'" title="Love this track on Last.fm" /></a>'
		}
		trackDataHtml += '</div>';
		
	} else {
		fetchTrackInfo(trackId);
	}
	
	el.html(trackDataHtml);
	if(settings.showlastfmlovebutton) {
		el.find("a.addons_lastfm_lovebutton").click(function() {
			setTrackLoved(trackId, track.metadata.title, track.metadata.artist);
			$(this).hide();
		});
	}
}

function applyChatHidden() {
	var styleNode = $("style#addons_css_hidechat");
	if(settings.hidechat && !styleNode.length) {
		styleNode = document.createElement("style");
		$(styleNode).attr("type", "text/css")
			.attr("id", "addons_css_hidechat")
			.append("div.annotation {display: none !important;}");
		$("head").append(styleNode);
	} else if(!settings.hidechat && styleNode.length) {
		styleNode.remove();
	}
}

function removeRecordImagesIfNecessary() {
	var styleNode = $("style#addons_css_records");
	if(!settings.albumart && styleNode.length) {
		styleNode.remove();
		recordsWithArtInCss = {};
	}
}

function setRecordImage(trackId, url) {
	if(settings.albumart && !recordsWithArtInCss[trackId]) {
		var styleNode = $("style#addons_css_records");
		if(!styleNode.length) {
			styleNode = document.createElement("style");
			styleNode = $(styleNode);
			styleNode.attr("type", "text/css")
				.attr("id", "addons_css_records");
			$("head").append(styleNode);
		}
		styleNode.append("div#record-"+ trackId +" div.record {background-image: url("+ url + ");} ");
		recordsWithArtInCss[trackId] = true;
	}
}

function setTrackLoved(trackId, title, artist) {
	chrome.extension.sendRequest({type: "settrackloved", id:trackId, title: title, artist: artist}, function(response) {});
}

function addTrackDataDiv(html, track, opt_userP) {
	var dataDiv = "<div id=\"addons_trackdata_"+ track.id +"\" class=\"addons_trackdata\"></div>";

	var jHtml = $(html);
	jHtml.find("div.description").append(dataDiv);
	html = $('<div>').append(jHtml.clone()).remove().html();

	return html;
}

function linkifyTwitterNames() {
	if(settings.twitterusernamelinks) {
		$(".username:not(.addons_twitter_username), li.user span.name:not(.addons_twitter_username)").each(function(index){
			$(this).addClass("addons_twitter_username");
			var username = this.innerHTML;
			this.dataset.username = username;
			var twitterUrl = "http://www.twitter.com/"+ username;
			this.innerHTML = "<a href=\""+ twitterUrl +"\" target=\"_blank\">" + username + "</a>";
		});
	}
}

function removeTwitterLinksIfNecessary() {
	if(!settings.twitterusernamelinks) {
		$(".username.addons_twitter_username, span.name.addons_twitter_username").each(function(index){
			$(this).removeClass("addons_twitter_username");
			this.innerHTML = this.dataset.username;
		});
	}
}

function zeroPadTime(num) {
	var str = new String(num);
	return str.length == 2 ? str : "0" + str;
}

function checkForNewChatMessages() {
	// Record the time of any new chat messages
	var untimed = $(".annotation:not([data-time])");
	untimed.each(function(index){
		// The first time we pick up messages it will probably be chat that was present when the user entered
		// the room, we have no idea when these messages were posted.
		if(initialChatMessagesProcessed) {
			var now = new Date();
			this.dataset.time = zeroPadTime(now.getHours()) + ":" + zeroPadTime(now.getMinutes());
		} else {
			this.dataset.time = "none";
		}
	});
	
	if(untimed.length > 0 && !initialChatMessagesProcessed) {
		initialChatMessagesProcessed = true;
	}
	
	if(settings.showchattimestamps) {
		$('.annotation[data-time]:not(:has(div.addons_chat_timestamp)):not([data-time="none"])').each(function(index) {
			$(this).prepend("<div class=\"addons_chat_timestamp\">"+ this.dataset.time +"</div>");
		});
	}
}

function removeChatTimestampsIfNecessary() {
	if(!settings.showchattimestamps) {
		$("div.addons_chat_timestamp").remove();
	}
}

function pulse() {
	checkForNewTracks();
	linkifyTwitterNames();
	checkForNewChatMessages();
}

function init() {
	$("body").append("<div id=\"addons\"></div>");
	chrome.extension.sendRequest({type: "gethtml", url:"popups.html"}, function(response) {
		$("#addons").html(response);
		
		$("#addons_settings_save").click(saveSettings);
		$("#addons_settings_cancel").click(hideSettings);
		$("#addons_changelog_close").click(hideChangelog);
		$("#addons_charts_close").click(hideCharts);
		
		loadSettings();
	
		$("#addons_lastfm_button").click(sendLastFmLogin);
		$("#addons_lastfm_cancel").click(dontDoLastFmLogin);
	});
	
	$("#sponsor").after("<div id=\"addons_links\"></div>");
	chrome.extension.sendRequest({type: "gethtml", url:"links.html"}, function(response) {
		$("#addons_links").html(response);
		$("#addons_charts_link").click(showCharts);
		$("#addons_settings_link").click(showSettings);
		$("#addons_changelog_link").click(showChangelog);
	});
	
	setInterval(pulse, 1000);
	setTimeout(loadSpinsData, 10000);
	chrome.extension.onRequest.addListener(processMessage);
	chrome.extension.sendRequest({type: "initroom", room: p.room.id}, function(response) {});
}

init();
