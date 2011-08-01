function Charts(room, lrdata, menuDivId, tableDivId, loaderDivId) {
	
	// From http://code.google.com/p/flexible-js-formatting/
	String.leftPad = function (val, size, ch) {
		var result = new String(val);
		if (ch == null) {
			ch = " ";
		}
		while (result.length < size) {
			result = ch + result;
		}
		return result;
	};
	
	// From http://www.xaprb.com/articles/date-formatting-demo.html
	Date.prototype.chartsFormatted = function (){return this.getFullYear() + '-' + String.leftPad(this.getMonth() + 1, 2, '0') + '-' + String.leftPad(this.getDate(), 2, '0') + ' ' + String.leftPad(this.getHours(), 2, '0') + ':' + String.leftPad(this.getMinutes(), 2, '0') + ':' + String.leftPad(this.getSeconds(), 2, '0');};
		
	var colProfiles = {
		users: [
			{name:"Username", column:"username", type:"u"},
			{name:"Plays", column:"plays"}
		],
		user_play: [
			{name:"Username", column:"username", type:"u"},
			{name:"Play Date", column:"play_date", type:"d"}
		],
		user_track_play: [
			{name:"Username", column:"username", type:"u"},
			{name:"Title", column:"track_title", type:"t"},
			{name:"Play Date", column:"play_date", type:"d"}
		],
		tracks: [
			{name:"Title", column:"track_title", type:"t"},
			{name:"Plays", column:"plays"}
		],
		track_artist: [
			{name:"Title", column:"track_title", type:"t"},
			{name:"Artist", column:"artist_name", type:"art"},
			{name:"Plays", column:"plays"}
		],
		track_artist_play: [
			{name:"Title", column:"track_title", type:"t"},
			{name:"Artist", column:"artist_name", type:"art"},
			{name:"Play Date", column:"play_date", type:"d"}
		],
		artists: [
			{name:"Artist", column:"artist_name", type:"art"},
			{name:"Plays", column:"plays"}
		]
	};
	
	function allTracks(page) {
		menu("tracks", "All Tracks");
		loadAndRender("all_tracks", {}, page, colProfiles.track_artist, {}, function() {
			allTracks(page + 1);
		});
	}
	this.allTracks = allTracks;
	
	function track_users(trackTitle, artistName, page) {
		menu("tracks", trackTitleEl(trackTitle, artistName), "users", [trackTitle, artistName, 0]);
		loadAndRender("track", {type: "users", artist_name: artistName, track_title: trackTitle}, page, colProfiles.users, {}, function() {
			track_users(trackTitle, artistName, page + 1);
		});
	}
	this.track_users = track_users;
	
	function track_tags(trackTitle, artistName, page) {
		menu("tracks", trackTitleEl(trackTitle, artistName), "tags", [trackTitle, artistName, 0]);
		tagCloud("track", {type: "tags", artist_name: artistName, track_title: trackTitle, limit: 60});
	}
	this.track_tags = track_tags;
	
	function track_plays(trackTitle, artistName, page) {
		menu("tracks", trackTitleEl(trackTitle, artistName), "plays", [trackTitle, artistName, 0]);
		loadAndRender("track", {type: "all_plays", artist_name: artistName, track_title: trackTitle}, page, colProfiles.user_play, {}, function() {
			track_plays(trackTitle, artistName, page + 1);
		});
	}
	this.track_plays = track_plays;
	
	function allArtists(page) {
		menu("artists", "All Artists");
		loadAndRender("all_artists", {}, page, colProfiles.artists, {}, function() {
			allArtists(page + 1);
		});
	}
	this.allArtists = allArtists;
	
	function artist_tracks(artistName, page) {
		menu("artists", artistName, "tracks", [artistName, 0]);
		loadAndRender("artist", {type: "tracks", artist_name: artistName}, page, colProfiles.tracks, {artist_name: artistName}, function() {
			artist_tracks(artistName, page + 1);
		});
	}
	this.artist_tracks = artist_tracks;
	
	function artist_users(artistName, page) {
		menu("artists", artistName, "users", [artistName, 0]);
		loadAndRender("artist", {type: "users", artist_name: artistName}, page, colProfiles.users, {artist_name: artistName}, function() {
			artist_users(artistName, page + 1);
		});
	}
	this.artist_users = artist_users;
	
	function artist_tags(artistName, page) {
		menu("artists", artistName, "tags", [artistName, 0]);
		tagCloud("artist", {type: "tags", artist_name: artistName, limit: 60});
	}
	this.artist_tags = artist_tags;
	
	function artist_plays(artistName, page) {
		menu("artists", artistName, "plays", [artistName, 0]);
		loadAndRender("artist", {type: "all_plays", artist_name: artistName}, page, colProfiles.user_track_play, {artist_name: artistName}, function() {
			artist_plays(artistName, page + 1);
		});
	}
	this.artist_plays = artist_plays;

	function allUsers(page) {
		menu("users", "All Users");
		loadAndRender("all_users", {}, page, colProfiles.users, {}, function() {
			allUsers(page + 1);
		});
	}
	this.allUsers = allUsers;
	
	function user_activity(username, page) {
		menu("users", username, "activity", [username, 0]);
		
		$("#" + tableDivId).empty();
		
		var dayOfWeek = $("<div />").addClass("addons_activity_chart");
		$("#" + tableDivId).append(dayOfWeek);
		
		var hourOfDay = $("<div />").addClass("addons_activity_chart");
		$("#" + tableDivId).append(hourOfDay);
		
		$("#" + tableDivId).hide();
		$("#" + loaderDivId).show();
		
		apiCall("user", {type: "activity_day_of_week", username: username}, 0, function(data) {
			var plotData = {data: [], color: "#333"},
				i,
				weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
			for(i = 0; i < data.length; i++) {
				plotData.data[i] = [data[i].day_of_week, data[i].plays];
			}
			
			$.plot(dayOfWeek, [plotData], {
				bars: {show: true, barWidth: 0.5, fill: 0.8, align: "center"},
				xaxis: {
					tickFormatter: function formatter(val, axis) {
						return weekDays[val];
					},
					min: -0.5,
					max: 6.5
				},
				yaxis: {show: false}
			});
			
			$("#" + tableDivId).show();
			$("#" + loaderDivId).hide();
		});
		
		apiCall("user", {type: "activity_hour", username: username}, 0, function(data) {
			var plotData = {data: [], color: "#333"},
				i;
			for(i = 0; i < data.length; i++) {
				plotData.data[i] = [data[i].hour, data[i].plays];
			}
			
			$.plot(hourOfDay, [plotData], {
				bars: {show: true, barWidth: 0.5, fill: 0.8, align: "center"},
				xaxis: {
					min: -0.5,
					max: 23.5
				},
				yaxis: {show: false}
			});
			
			$("#" + tableDivId).show();
			$("#" + loaderDivId).hide();
		});
	}
	this.user_activity = user_activity;
	
	function user_artists(username, page) {
		menu("users", username, "artists", [username, 0]);
		loadAndRender("user", {type: "artists", username: username}, page, colProfiles.artists, {}, function() {
			user_artists(username, page + 1);
		});
	}
	this.user_artists = user_artists;
	
	function user_tracks(username, page) {
		menu("users", username, "tracks", [username, 0]);
		loadAndRender("user", {type: "tracks", username: username}, page, colProfiles.track_artist, {}, function() {
			user_tracks(username, page + 1);
		});
	}
	this.user_tracks = user_tracks;
	
	function user_tags(username, page) {
		menu("users", username, "tags", [username, 0]);
		tagCloud("user", {type: "tags", username: username, limit: 60});
	}
	this.user_tags = user_tags;
	
	function user_plays(username, page) {
		menu("users", username, "plays", [username, 0]);
		loadAndRender("user", {type: "all_plays", username: username}, page, colProfiles.track_artist_play, {}, function() {
			user_plays(username, page + 1);
		});
	}
	this.user_plays = user_plays;
	
	function apiCall(pageName, extraParams, pageNo, callback) {
		var params = {room: room, limit: 200, offset: pageNo * 200};
		var key;
		for (key in extraParams) {
			if (extraParams.hasOwnProperty(key)) {
				params[key] = extraParams[key];
			}
		}
		
		lrdata.getData(pageName, params, callback);
	}
	
	function loadAndRender(pageName, extraParams, pageNo, columnProfile, altValues, nextPageFn) {		
		$("#" + tableDivId).hide();
		$("#" + loaderDivId).show();
		
		apiCall(pageName, extraParams, pageNo, function(data) {
			renderTable(data, columnProfile, altValues, nextPageFn);
			
			$("#" + tableDivId).show();
			$("#" + loaderDivId).hide();
		});
	}
	
	function getValWithFallback(dataRow, key, altValues) {
		if(dataRow[key]) {
			return dataRow[key];
		} else {
			return altValues[key];
		}
	}
	
	function getLinkFunction(dataRow, type, altValues) {
		switch(type) {
		case "art":
			return function() {artist_tracks(getValWithFallback(dataRow, "artist_name", altValues), 0);};
		case "t":
			return function() {track_users(getValWithFallback(dataRow, "track_title", altValues), getValWithFallback(dataRow, "artist_name", altValues), 0);};
		case "u":
			return function() {user_activity(getValWithFallback(dataRow, "username", altValues), 0);};
		}
	}
	
	function getImageUrl(dataRow, type, altValues) {
		switch(type) {
		case "art":
			return lrdata.getArtistImageUrl("charts", getValWithFallback(dataRow, "artist_name", altValues));
		case "t":
			return lrdata.getTrackImageUrl("charts", getValWithFallback(dataRow, "track_title", altValues), getValWithFallback(dataRow, "artist_name", altValues));
		case "u":
			return "";
		}
	}
	
	function renderTable(data, columns, altValues, nextPageFn) {
		var div = $("#" + tableDivId);
		div.empty();
		
		var i, j;
		var table = $("<table />");
		var headerRow = $("<tr />");
		for(j = 0; j < columns.length; j++) {
			var th = $("<th />");
			th.text(columns[j].name);
			headerRow.append(th);
		}
		table.append(headerRow);
		for(i = 0; i < data.length; i++) {
			var dataRow = data[i];
			var row = $("<tr />");
			for(j = 0; j < columns.length; j++) {
				var cell = $("<td />");
				if(columns[j].type && columns[j].type === "d") {
					var dt = new Date(dataRow[columns[j].column] * 1000);
					cell.text(dt.chartsFormatted());
					cell.addClass("nobreak");
				} else if(columns[j].type) {
					var rowDiv = $("<div />");
					rowDiv.addClass("chart_row");
					cell.append(rowDiv);
					
					var imgUrl = getImageUrl(dataRow, columns[j].type, altValues);
					if(imgUrl !== "") {
						var imgDiv = $("<div />");
						imgDiv.addClass("chart_image");
						rowDiv.append(imgDiv);
						var img = $("<img />");
						img.attr("src", imgUrl);
						img.error(function () { 
							$(this).hide();
						});
						imgDiv.append(img);
					}
					var linkDiv = $("<div />");
					linkDiv.addClass("chart_link");
					rowDiv.append(linkDiv);
					
					var link = $("<a />");
					link.text(dataRow[columns[j].column]);
					link.click(getLinkFunction(dataRow, columns[j].type, altValues));
					linkDiv.append(link);
				} else {
					cell.text(dataRow[columns[j].column]);
				}
				row.append(cell);
			}
			table.append(row);
		}
		div.append(table);
		if(data.length === 200) {
			div.append($("<div />").addClass("more_link").append($("<a />").text("More >>").click(nextPageFn)));
		}
	}
	
	function trackTitleEl(trackTitle, artistName) {
		var artistLink = $("<a />").text(artistName).click(function() {
			artist_tracks(artistName, 0);
		});
		return $("<span />").append(artistLink).append($("<span />").text(" - "+ trackTitle));
	}
	
	var firstLevelMenu = [
		{title: "Tracks", id: "tracks", func: allTracks},
		{title: "Artists", id: "artists", func: allArtists},
		{title: "Users", id: "users", func: allUsers}
	];
	
	var secondLevelMenus = {
		tracks: [
			{title: "Users", id: "users", func: track_users},
			{title: "Tags", id: "tags", func: track_tags},
			{title: "Plays", id: "plays", func: track_plays}
		],
		artists: [
			{title: "Tracks", id: "tracks", func: artist_tracks},
			{title: "Users", id: "users", func: artist_users},
			{title: "Tags", id: "tags", func: artist_tags},
			{title: "Plays", id: "plays", func: artist_plays}
		],
		users: [
			{title: "Activity", id: "activity", func: user_activity},
			{title: "Artists", id: "artists", func: user_artists},
			{title: "Tracks", id: "tracks", func: user_tracks},
			{title: "Tags", id: "tags", func: user_tags},
			{title: "Plays", id: "plays", func: user_plays}
		]
	};
	
	function getFirstLevelFunction(menuArray, i, args) {
		return function() {menuArray[i].func(0);};
	}
	
	function getSecondLevelFunction(menuArray, i, args) {
		return function() {menuArray[i].func.apply(this, args);};
	}
	
	function buildMenu(menuDesc, selected, clickGenerator, args) {
		var div = $("<div />");
		div.addClass("addons_charts_menu_" + menuDesc.length);
		var i;
		for(i = 0; i < menuDesc.length; i++) {
			var a = $("<a />").text(menuDesc[i].title);
			
			a.click(clickGenerator(menuDesc, i, args)); // We do this in a sub function so that we keep the right value of i.
			
			if(selected === menuDesc[i].id) {
				a.addClass("selected");
			}
			div.append(a);
		}
		return div;
	}
	
	function menu(selected, title, subSelected, args) {
		var div = $("#" + menuDivId).empty();
		
		div.append(buildMenu(firstLevelMenu, selected, getFirstLevelFunction, args));
		
		if(typeof(title) === "string") {
			div.append($("<h3 />").text(title));
		} else {
			div.append($("<h3 />").append(title));
		}
		
		if(subSelected) {
			var menuDesc = secondLevelMenus[selected];
			div.append(buildMenu(menuDesc, subSelected, getSecondLevelFunction, args));
		}
	}

	function tagCloud(pageName, extraParams) {
		var div = $("#" + tableDivId);
		div.empty();
		
		$("#" + tableDivId).hide();
		$("#" + loaderDivId).show();
		
		apiCall(pageName, extraParams, 0, function(data) {
			var ul = $("<ul />").addClass("addons_tagcloud"),
				i;
			
			for(i = 0; i < data.length; i++) {
				ul.append($("<li />").attr("value", data[i].tag_count).text(data[i].tag_name));
			}
			
			div.append(ul);
			
			$("#" + tableDivId).show();
			$("#" + loaderDivId).hide();
			
			ul.tagcloud({colormin: "AAA", colormax: "111", type: "sphere", power: 0.3, height:170});
		});
	}
}
