function LRDataInterface(hostname, port) {

	var urlRoot = "http://"+ hostname
	if(port) {
		urlRoot += ":"+ port;
	}
	
	function sendTrackData(track, callback) {
		if(track.title && track.title !== "" && track.artist && track.artist !== "") {
			var url = urlRoot +"/addtrackplay/?callback=?";
			$.getJSON(
				url,
				{
					id: track.id,
					artist: track.artist,
					title: track.title,
					album: track.album,
					user: track.username,
					userId: track.user_id,
					room: track.room,
					timestamp: track.date,
					reportedByUser: track.reported_by_user,
					reportedByUserId: track.reported_by_user_id
				},
				function(data, textStatus, jqXHR) {
					callback(data);
				}
			);
		}
	}
	this.sendTrackData = sendTrackData;
	
	function getTrackImageUrl(title, artist, album) {
		var url = urlRoot + "/trackimage/?";
		url += $.param({title: title, artist: artist, album: album});
		return url;
	}
	this.getTrackImageUrl = getTrackImageUrl;
	
	function getData(page, params, callback) {
		var url = urlRoot +"/v1/"+ page +".json?callback=?";
		$.getJSON(
			url,
			params,
			function(data, textStatus, jqXHR) {
				callback(data);
			}
		);
	}
	this.getData = getData;
	
	function getUsers(room, callback) {
		getData("all_users", {room: room}, callback);
	}
	this.getUsers = getUsers;
	
}
