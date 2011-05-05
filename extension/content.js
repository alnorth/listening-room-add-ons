var pDiv = document.createElement("div");
pDiv.setAttribute("onclick", "return window;");
p = pDiv.onclick();

var $ = p.$;
var settings;
var storedTrackInfo = {};
var recordsWithArtInCss = {};

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

function getUser(id) {
	var user = undefined;
	for(var i = 0; i < p.room.users.length; i++) {
		if(p.room.users[i].id == id) {
			user = p.room.users[i];
		}
	}
	return user;
}

function addTrackToDB(id) {
	var track = p.room.tracks[id];
	var user = getUser(track.userId);
	var trackData = {
		id: id,
		filename: track.upload.originalFilename
	};
	if(user != undefined) {
		trackData.user = user.name;
	}
	if(track.metadata.artist != undefined && track.metadata.title != undefined) {
		trackData.title = track.metadata.title;
		trackData.artist = track.metadata.artist;
		trackData.album = track.metadata.album;
	}
	chrome.extension.sendRequest({type: "addtracktodb", track: trackData, isCurrent: (id == p.room.nowPlaying)}, function(response) {});
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
}

function loadSettings() {
	chrome.extension.sendRequest({type: "getsettings"}, function(newSettings) {
		document.getElementById("addons_settings_hidechat").checked = newSettings.hidechat;
		document.getElementById("addons_settings_showuploader").checked = newSettings.showuploader;
		document.getElementById("addons_settings_albumart").checked = newSettings.albumart;
		document.getElementById("addons_settings_twitterusernamelinks").checked = newSettings.twitterusernamelinks;
		
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
	$("div.recordWithDescription:not(.addons_added_to_db)").each(function() {
		var trackId = this.id.replace("record-", "");
		addTrackToDB(trackId);
		$(this).addClass("addons_added_to_db");
	});
	$("div.addons_trackdata:not(.addons_track_data_populated)").each(function(index) {
		var trackId = this.id.replace("addons_trackdata_", "");
		updateSingleTrackData(trackId, $(this));
		$(this).addClass("addons_track_data_populated");
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
					trackDataHtml += '<div class="addons_uploader">Uploaded by <span class="username addons_username" data-username="'+ user +'"><a href="'+ twitterUrl +'" target="_blank">'+ user +'</a></span></div>';
				} else {
					trackDataHtml += '<div class="addons_uploader">Uploaded by <span class="username">'+ user +'</span></div>';
				}
			} else {
				trackDataHtml += '<div class="addons_uploader">Uploader has now left the room</div>';
			}
		}
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
		$(".username:not(.addons_username), li.user span.name:not(.addons_username)").each(function(index){
			$(this).addClass("addons_username");
			var username = this.innerHTML;
			this.dataset.username = username;
			var twitterUrl = "http://www.twitter.com/"+ username;
			this.innerHTML = "<a href=\""+ twitterUrl +"\" target=\"_blank\">" + username + "</a>";
		});
	}
}

function removeTwitterLinksIfNecessary() {
	if(!settings.twitterusernamelinks) {
		$(".username.addons_username, span.name.addons_username").each(function(index){
			$(this).removeClass("addons_username");
			this.innerHTML = this.dataset.username;
		});
	}
}

function pulse() {
	checkForNewTracks();
	linkifyTwitterNames();
}

function init() {
	$("body").append("<div id=\"addons\"></div>");
	chrome.extension.sendRequest({type: "gethtml", url:"popups.html"}, function(response) {
		$("#addons").html(response);
		
		$("#addons_settings_save").click(saveSettings);
		$("#addons_settings_cancel").click(hideSettings);
		$("#addons_changelog_close").click(hideChangelog);
		
		loadSettings();
	
		$("#addons_lastfm_button").click(sendLastFmLogin);
		$("#addons_lastfm_cancel").click(dontDoLastFmLogin);
	});
	
	$("#sponsor").before("<div id=\"addons_links\"></div>");
	chrome.extension.sendRequest({type: "gethtml", url:"links.html"}, function(response) {
		$("#addons_links").html(response);
		$("#addons_settings_link").click(showSettings);
		$("#addons_changelog_link").click(showChangelog);
	});
	
	if(!p.viz.recordHtmlOriginal) {
		p.viz.recordHtmlOriginal = p.viz.recordHtml;
		p.viz.recordHtmlMods = [];
		
		p.viz.recordHtml = function(track, opt_userP) {
			var html = p.viz.recordHtmlOriginal(track, opt_userP);
			html = addTrackDataDiv(html, track, opt_userP);
			return html;
		};
	}
	
	setInterval(pulse, 1000);
	chrome.extension.onRequest.addListener(processMessage);
}

init();