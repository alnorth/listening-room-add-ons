function LRDataInterface(hostname, port) {

	var urlRoot = "http://"+ hostname +":"+ port;
	
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
	
	function getUsers(room, callback) {
		var url = urlRoot +"/v1/all_users.json?callback=?";
		$.getJSON(
			url,
			{room: room},
			function(data, textStatus, jqXHR) {
				callback(data);
			}
		);
	}
	this.getUsers = getUsers;
	
}
