var pDiv = document.createElement("div");
pDiv.setAttribute("onclick", "return window;");
var p = pDiv.onclick();

var $ = p.$,
	lrdata = new LRDataInterface("lrdata.alnorth.com"),
	lastfm = new LastFmInterface(),
	charts = new Charts(p.room.id, lrdata, "addons_charts_menu", "addons_charts_table", "addons_charts_loader"),
	settings,
	storedTrackInfo = {},
	recordsWithArtInCss = {},
	initialChatMessagesProcessed = false,
	lastChatMessage = "",
	lastSongNotifiedId = "",
	focused = true;

function getTrackStartTimestamp(trackId) {
	var timestamp = null;
	var i, h;
	for(i = p.room.history.length - 1; i >= 0; i--) {
		h = p.room.history[i];
		if(h.event === "trackStart" && h.data === trackId) {
			timestamp = h.timestamp;
		}
	}
	if(timestamp === null) {
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
			if(i === 0) {
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
	var user = p.room.users[track.userId];
	var trackData = {
		id: track.id,
		userId: track.userId,
		room: p.room.id,
		timestamp: track.startTime || getTrackStartTimestamp(track.id),
		reportedByUser: p.room.user.name,
		reportedByUserId: p.room.user.id,
		length: Math.floor(track.length / 1000)
	};
	if(user !== undefined) {
		trackData.user = user.name;
	}
	if(track.metadata.artist !== undefined && track.metadata.title !== undefined) {
		trackData.title = track.metadata.title;
		trackData.artist = track.metadata.artist;
		if(track.metadata.album !== undefined) {
			trackData.album = track.metadata.album;
		}
	}
	chrome.extension.sendRequest({type: "addtracktodb", track: trackData, isCurrent: (track.id === p.room.nowPlaying)}, function(response) {
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
	$('input[type="checkbox"][id^="addons_settings_"]').each(function() {
		var key = this.id.replace("addons_settings_", "");
		settings[key] = this.checked;
	});
	$('input[type="number"][id^="addons_settings_"]').each(function() {
		var key = this.id.replace("addons_settings_", "");
		settings[key] = this.value;
	});
	
	chrome.extension.sendRequest({type: "savesettings", settings:settings}, function(response) {});
	
	hideSettings();
	updateAllTrackData();
	applyChatHidden();
	removeRecordImagesIfNecessary();
	refreshRecordImages();
	removeTwitterLinksIfNecessary();
	removeChatTimestampsIfNecessary();
	setRecordRefreshRate();
}

function loadSettings() {
	chrome.extension.sendRequest({type: "getsettings"}, function(newSettings) {
		var key;
		for (key in newSettings) {
			if (newSettings.hasOwnProperty(key)) {
				var el = document.getElementById("addons_settings_" + key);
				if(el) {
					if(el.type === "number") {
						el.value = newSettings[key];
					} else {
						el.checked = newSettings[key];
					}
				}
			}
		}
		
		settings = newSettings;
		applyChatHidden();
		setRecordRefreshRate();
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

function showLastFmLoginPopup() {
	var url = "http://www.last.fm/api/auth/?api_key=" + lastfmApiKey + "&cb=" + chrome.extension.getURL("lastfm_callback.html");
	var lastfmWindow = window.open(url, "lastfm", "height=500,width=950");
	if (window.focus) {lastfmWindow.focus()}
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
	if(request.type === "lastfmloginneeded") {
		showLastFmLogin();
		sendResponse({});
	} else if(request.type === "lastfmlogindone") {
		hideLastFmLogin();
		sendResponse({});
	} else if(request.type === "updatedtrackinfo") {
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
	
	// But there's no need to wait to show the notifications
	if(settings.showsongnotifications) {
		var $songBlock = $(".trackHistory-current .recordWithDescription");
		if($songBlock.length === 1) {
			var	trackId = $songBlock.attr('id').replace("record-", ""),
				track = p.room.tracks[trackId],
				user = p.room.users[track.userId],
				artStyle = $songBlock.find(".recordWrapper .record").css("background-image") + "",
				art = "",
				trackText = "";
			
			if(trackId !== lastSongNotifiedId) {
				lastSongNotifiedId = trackId;
				
				if(user && track.metadata && track.metadata.title) {
					if(artStyle !== "none") {
						art = artStyle.slice(4, artStyle.length - 1);
					} else if(track.metadata.artist) {
						art = lrdata.getTrackImageUrl("record", track.metadata.title, track.metadata.artist, track.metadata.album);
					}
					
					trackText += track.metadata.title;
					if(track.metadata.artist) {
						trackText += " by ";
						trackText += track.metadata.artist;
					}
					/*
					if(track.metadata.album) {
						trackText += " from ";
						trackText += track.metadata.album;
					}
					*/
					desktopAlert({
						title: user.name + " is playing:",
						image: art,
						body: trackText,
						timeout: settings.notificationtimeout * 1000
					})
				}
			}
		}
	}
}

function buttonEl(url, imageUrl, titleText) {
	return $("<a />").attr("href", url).attr("target", "_blank")
			.append($("<img />").css("border", "0px").attr("src", imageUrl).attr("title", titleText));
}

function fetchTrackInfo(trackId) {
	chrome.extension.sendRequest({type: "gettrackinfo", id:trackId}, function(response) {
		if(response !== undefined) {
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
	
	if(track && el.length === 1) {
		var trackDataEl;
		
		var trackInfo = storedTrackInfo[trackId];
		if(trackInfo) {
			trackDataEl = $("<div />").addClass("addons_track_links");
			if(settings.lastfmlink && trackInfo.lastfmurl && trackInfo.lastfmurl !== "none") {
				trackDataEl.append(buttonEl(trackInfo.lastfmurl, chrome.extension.getURL("lastfm_button.png"), "See this track on Last.fm."));
			}
			if(settings.showscrobblestatus && trackInfo.lastfmstatus) {
				var imagePath = "";
				var titleText = "";
				if(trackInfo.lastfmstatus === lastfmStatus.UNSENT || trackInfo.lastfmstatus === lastfmStatus.PLAYING_SENT || trackInfo.lastfmstatus === lastfmStatus.WAITING_FOR_SCROBBLING) {
					imagePath = "notscrobbled.png";
					titleText = "This track has not been scrobbled yet. This will usually happen when the track finishes playing.";
				} else if(trackInfo.lastfmstatus === lastfmStatus.SCROBBLED) {
					imagePath = "scrobbled.png";
					titleText = "This track has been scrobbled.";
				}
				if(imagePath !== "") {
					trackDataEl.append($("<img />").css("border", "0px").attr("src", chrome.extension.getURL(imagePath)).attr("title", titleText));
				}
			}
			if(settings.showlastfmlovebutton && !trackInfo.lastfmloved && track.metadata.title) {
				var loveLink = $("<a />").attr("href", "javascript:void(0);");
				loveLink.append($("<img />").css("border", "0px").attr("src", chrome.extension.getURL("lovebutton.png")).attr("title", "Love this track on Last.fm"));
				loveLink.click(function() {
					setTrackLoved(trackId, track.metadata.title, track.metadata.artist);
					$(this).hide();
				});
				trackDataEl.append(loveLink);
			}
			if(settings.showchartlinks) {
				var userLink = $("<a />").attr("href", "javascript:void(0);").attr("title", "User chart data");
				userLink.append($("<img />").css("border", "0px").attr("src", chrome.extension.getURL("user-link.png")));
				userLink.click(function() {
					charts.user_artists(trackInfo.user, 0);
					showCharts();
				});
				trackDataEl.append(userLink);
				
				if(track.metadata.title && track.metadata.artist) {
					var trackLink = $("<a />").attr("href", "javascript:void(0);").attr("title", "Track chart data");
					trackLink.append($("<img />").css("border", "0px").attr("src", chrome.extension.getURL("track-link.png")));
					trackLink.click(function() {
						charts.track_users(track.metadata.title, track.metadata.artist, 0);
						showCharts();
					});
					trackDataEl.append(trackLink);
					
					var artistLink = $("<a />").attr("href", "javascript:void(0);").attr("title", "Artist chart data");
					artistLink.append($("<img />").css("border", "0px").attr("src", chrome.extension.getURL("artist-link.png")));
					artistLink.click(function() {
						charts.artist_tracks(track.metadata.artist, 0);
						showCharts();
					});
					trackDataEl.append(artistLink);
				}
			}
			if (settings.showtracktimes) {
				var len_full;
				var len_hour;
				var lengthSpan = $('<span />').attr('class', 'addons_tracklength').attr('id', 'track_time_' + track.id);
				var len = (track.length / 1000);
				var len_min = Math.floor(len / 60);
				var len_sec = Math.round(len % 60);

				len_sec = (('' + len_sec).length == 1) ? ('0' + len_sec) : ('' + len_sec);

				if (len_min > 60) {
					len_hour = Math.floor(len_min / 60);
					len_min  = len_min % 60;
					len_min  = (('' + len_min).length == 1) ? ('0' + len_min) : ('' + len_min);

					len_full = [len_hour, len_min, len_sec].join(':');
				} else {
					len_full = [len_min, len_sec].join(':');
				}

				trackDataEl.append(lengthSpan.append(len_full));
			}
			
		} else {
			fetchTrackInfo(trackId);
		}
		
		el.empty();
		el.append(trackDataEl);
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
	if(!settings.albumart) {
		$('div.record[data-provider="lrdata"]').each(function(index) {
			$(this).css("background-image", "none");
		});
	}
}

function refreshRecordImages() {
	if(settings.albumart) {
		$("div.recordWithDescription div.record, li.user.current-user div.record.mini-record").each(function(index) {
			if($(this).css("background-image") === "none") {
				var trackId = "";
				if($(this).hasClass("mini-record")) {
					trackId = p.room.users[p.room.user.id].tracks[$(this).index()];
				} else {
					trackId = this.parentNode.parentNode.id.replace("record-", "");
				}
				var track = p.room.tracks[trackId];
				if(track && track.metadata && track.metadata.title && track.metadata.artist) {
					var url = lrdata.getTrackImageUrl("record", track.metadata.title, track.metadata.artist, track.metadata.album);
					url = url.replace(/"/g, '\\"');
					$(this).css("background-image", "url(\""+ url +"\")");
					this.dataset.provider = "lrdata";
				}
			}
		});
	}
}

function setTrackLoved(trackId, title, artist) {
	chrome.extension.sendRequest({type: "settrackloved", id:trackId, title: title, artist: artist}, function(response) {});
}

function linkifyTwitterNames() {
	if(settings.twitterusernamelinks) {
		$(".username:not(.addons_twitter_username), li.user span.name:not(.addons_twitter_username),  p.addedUser > a:not(.addons_twitter_username):not([href])").each(function(index){
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
		$(".username.addons_twitter_username, span.name.addons_twitter_username, a.addons_twitter_username").each(function(index){
			$(this).removeClass("addons_twitter_username");
			this.innerHTML = this.dataset.username;
		});
	}
}

function zeroPadTime(num) {
	var str = num.toString();
	return str.length === 2 ? str : "0" + str;
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
	
	if(settings.showchatnotifications) {
		var $chatBlock = $(".annotations").first().find(".annotation").first(),
			userName = $chatBlock.find(".username").data("username"),
			avatar = $chatBlock.find(".avatar").attr("src"),
			message = $chatBlock.find(".message").last().html(),
			newChatMessage = userName + message;
		if(message && lastChatMessage !== newChatMessage && newChatMessage !== "" && userName != p.room.user.name) {
			lastChatMessage = userName + message;
			desktopAlert({
		        title: userName,
		        image: avatar,
		        body: message,
		        timeout: settings.notificationtimeout * 1000
		    });
		}
	}
}

function desktopAlert(notificationData) {
	if(!focused) {
		chrome.extension.sendRequest({type: "shownotification", notificationData: notificationData}, function(response) {});
	}
}

function removeChatTimestampsIfNecessary() {
	if(!settings.showchattimestamps) {
		$("div.addons_chat_timestamp").remove();
	}
}

function setRecordRefreshRate() {
	p.lr.FPS = settings.recordrefreshrate;
}

function addChangeLog() {
	$("#addons").append('<div id="addons_changelog">\
			<h3>Add-ons Change Log</h3>\
			<div id="addons_changelog_div"/>\
			<a id="addons_changelog_close" href="javascript:void(0);">Close</a>\
		</div>');
		
	var changelogDiv = $("#addons_changelog_div"),
		v = 0,
		i = 0,
		ul = false;
	
	for(v in changeLog) {
		if(typeof(changeLog[v] !== "function")) {
			changelogDiv.append($("<h4 />").text(v));
			ul = $("<ul />");
			changelogDiv.append(ul);
			for(i = 0; i < changeLog[v].length; i++) {
				ul.append($("<li />").text(changeLog[v][i]));
			}
		}
	}
}

function pulse() {
	checkForNewTracks();
	linkifyTwitterNames();
	checkForNewChatMessages();
	refreshRecordImages();
}

function init() {
	$("body").append("<div id=\"addons\"></div>");
	chrome.extension.sendRequest({type: "gethtml", url:"popups.html"}, function(response) {
		$("#addons").html(response);
		
		addChangeLog();
		
		$("#addons_settings_save").click(saveSettings);
		$("#addons_settings_cancel").click(hideSettings);
		$("#addons_changelog_close").click(hideChangelog);
		$("#addons_charts_close").click(hideCharts);
		
		$("#addons_charts_loader").append($("<img />").attr("src", chrome.extension.getURL("ajax-loader.gif")));
		
		loadSettings();
	
		$("#addons_lastfm_button").click(showLastFmLoginPopup);
		$("#addons_lastfm_cancel").click(dontDoLastFmLogin);
	});
	
	$("#sponsor").after("<div id=\"addons_links\"></div>");
	chrome.extension.sendRequest({type: "gethtml", url:"links.html"}, function(response) {
		var roomLinks = roomSpecificLinks[p.room.id];
		if(roomLinks) {
			var ul = $("<ul />");
			var i;
			for(i = 0; i < roomLinks.length; i++) {
				var link = $("<a />");
				link.text(roomLinks[i].text);
				link.attr("href", roomLinks[i].url);
				link.attr("target", "_blank");
				
				ul.append($("<li />").append(link));
			}
			$("#addons_links").append($("<h3 />").text($("h1").text()));
			$("#addons_links").append(ul);
		}
		
		$("#addons_links").append(response);
		$("#addons_charts_link").click(function() {charts.allTracks(0); showCharts();});
		$("#addons_settings_link").click(showSettings);
		$("#addons_changelog_link").click(showChangelog);		
	});
	
	setInterval(pulse, 1000);
	setTimeout(loadSpinsData, 10000);
	chrome.extension.onRequest.addListener(processMessage);
	chrome.extension.sendRequest({type: "initroom", room: p.room.id}, function(response) {});
	
	window.addEventListener('focus', function() {
		focused = true;
	});

	window.addEventListener('blur', function() {
		focused = false;
	});
}

init();
