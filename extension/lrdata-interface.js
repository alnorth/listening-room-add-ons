function LRDataInterface(hostname, port) {
	
	function sendTrackData(track) {
		if(track.title && track.title != "" && track.artist && track.artist != "") {
			var url = "http://"+ hostname +":"+ port +"/addtrackplay/?callback=?";
			$.getJSON(
				url,
				{
					id: track.id,
					artist: track.artist,
					title: track.title,
					album: track.album,
					filename: track.filename,
					user: track.user,
					userId: track.userId,
					room: track.room,
					timestamp: track.timestamp,
					reportedByUser: track.reportedByUser,
					reportedByUserId: track.reportedByUserId
				}
			);
		}
	}
	this.sendTrackData = sendTrackData;
}
