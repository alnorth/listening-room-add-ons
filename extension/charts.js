function Charts(room, lrdata, menuDivId, tableDivId) {

	var colProfiles = {
		users: [
			{name:"Username", column:"username", type:"u"},
			{name:"Plays", column:"plays"}
		],
		user_play: [
			{name:"Username", column:"username", type:"u"},
			{name:"Play Date", column:"play_date", type:"d"}
		],
		track_artist: [
			{name:"Title", column:"track_title", type:"t"},
			{name:"Artist", column:"artist_name", type:"art"},
			{name:"Plays", column:"plays"}
		],
		artists: [
			{name:"Artist", column:"artist_name", type:"art"},
			{name:"Plays", column:"plays"}
		]
	}

	function allTracks() {
		menu("tracks", "All Tracks");
		lrdata.getData("all_tracks", {room: room}, function(data) {
			renderTable(data, colProfiles.track_artist);
		});
	}
	this.allTracks = allTracks;
	
	function track_users(trackTitle, artistName) {
		menu("tracks", artistName +" - "+ trackTitle, "users", arguments);
		lrdata.getData("track", {room: room, type: "users", artist_name: artistName, track_title: trackTitle}, function(data) {
			renderTable(data, colProfiles.users);
		});
	}
	this.track_users = track_users;
	
	function track_plays(trackTitle, artistName) {
		menu("tracks", artistName +" - "+ trackTitle, "plays", arguments);
		lrdata.getData("track", {room: room, type: "all_plays", artist_name: artistName, track_title: trackTitle}, function(data) {
			renderTable(data, colProfiles.user_play);
		});
	}
	this.track_plays = track_plays;
	
	function allArtists() {
		menu("artists", "All Artists");
		lrdata.getData("all_artists", {room: room}, function(data) {
			renderTable(data, colProfiles.artists);
		});
	}
	this.allArtists = allArtists;
	
	function artist(artistName) {
		menu("artists");
		alert(artistName);
	}
	this.artist = artist;

	function allUsers() {
		menu("users", "All Users");
		lrdata.getUsers(room, function(data) {
			renderTable(data, colProfiles.users);
		});
	}
	this.allUsers = allUsers;
	
	function user(username) {
		menu("users");
		alert(username);
	}
	this.user = user;
	
	function getLinkFunction(dataRow, type) {
		switch(type) {
		case "art":
			return function() {artist(dataRow["artist_name"]);};
		case "t":
			return function() {track_users(dataRow["track_title"], dataRow["artist_name"]);};
		case "u":
			return function() {user(dataRow["username"]);};
		}
	}
	
	function renderTable(data, columns) {
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
				if(columns[j].type && columns[j].type == "d") {
					var dt = new Date(dataRow[columns[j].column] * 1000);
					cell.text(dt.toLocaleString());
				} else if(columns[j].type) {
					var link = $("<a />");
					link.text(dataRow[columns[j].column]);
					link.click(getLinkFunction(dataRow, columns[j].type));
					cell.append(link);
				} else {
					cell.text(dataRow[columns[j].column]);
				}
				row.append(cell);
			}
			table.append(row);
		}
		div.append(table);
	}
	
	function menu(selected, title, subSelected, args) {
		var div = $("#" + menuDivId);
		div.html('<div><a id="'+ menuDivId +'_tracks">Tracks</a><a id="'+ menuDivId +'_artists">Artists</a><a id="'+ menuDivId +'_users">Users</a></div>');
		div.find("#"+ menuDivId +"_"+ selected).addClass("selected");
		div.find("#"+ menuDivId +"_tracks").click(allTracks);
		div.find("#"+ menuDivId +"_artists").click(allArtists);
		div.find("#"+ menuDivId +"_users").click(allUsers);
		
		var title = $("<h3 />").text(title);
		div.append(title);
		
		if(subSelected) {
			switch(selected) {
				case "tracks":
					div.append('<div><a id="'+ menuDivId +'_tracks_users">Users</a><a id="'+ menuDivId +'_tracks_plays">All Plays</a></div>');
					div.find("#"+ menuDivId +"_tracks_"+ subSelected).addClass("selected");
					div.find("#"+ menuDivId +"_tracks_users").click(function() {track_users.apply(this, args);});
					div.find("#"+ menuDivId +"_tracks_plays").click(function() {track_plays.apply(this, args);});
					break;
			}
		}
	}

}