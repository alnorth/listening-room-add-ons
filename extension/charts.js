function Charts(room, lrdata, menuDivId, tableDivId) {

	function allTracks() {
		menu("tracks", "All Tracks");
		lrdata.getData("all_tracks", {room: room}, function(data) {
			renderTable(data, [
				{name:"Title", column:"track_title", type:"t"},
				{name:"Artist", column:"artist_name", type:"art"},
				{name:"Plays", column:"plays"}
			]);
		});
	}
	this.allTracks = allTracks;
	
	function track(titleTitle, artistName) {
		menu("tracks");
		alert(titleTitle);
	}
	this.track = track;
	
	function allArtists() {
		menu("artists", "All Artists");
		lrdata.getData("all_artists", {room: room}, function(data) {
			renderTable(data, [
				{name:"Artist", column:"artist_name", type:"art"},
				{name:"Plays", column:"plays"}
			]);
		});
	}
	this.allArtists = allArtists;
	
	function artist(artistName) {
		menu("artists");
		alert(artistName);
	}
	this.track = track;

	function allUsers() {
		menu("users", "All Users");
		lrdata.getUsers(room, function(data) {
			renderTable(data, [
				{name:"Username", column:"username", type:"u"},
				{name:"Plays", column:"plays"}
			]);
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
			return function() {track(dataRow["track_title"], dataRow["artist_name"]);};
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
				if(columns[j].type) {
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
	
	function menu(selected, title, subSelected) {
		var div = $("#" + menuDivId);
		div.html('<div><a id="'+ menuDivId +'_tracks">Tracks</a><a id="'+ menuDivId +'_artists">Artists</a><a id="'+ menuDivId +'_users">Users</a></div>');
		div.find("#"+ menuDivId +"_"+ selected).addClass("selected");
		div.find("#"+ menuDivId +"_tracks").click(allTracks);
		div.find("#"+ menuDivId +"_artists").click(allArtists);
		div.find("#"+ menuDivId +"_users").click(allUsers);
		
		var title = $("<h2 />").text(title);
		div.append(title);
	}

}