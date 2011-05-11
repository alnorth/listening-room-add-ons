function LRDataInterface(hostname, port) {
	
	function sendTrackData(track, callback) {
		if(track.title && track.title != "" && track.artist && track.artist != "") {
			var url = "http://"+ hostname +":"+ port +"/addtrackplay/?callback=?";
			$.getJSON(
				url,
				{
					id: track.id,
					artist: track.artist,
					title: track.title,
					album: track.album,
					user: track.user,
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
}
