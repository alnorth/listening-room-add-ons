function LRDataInterface(hostname, port) {
	
	function sendTrackData(track) {
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
				timestamp: (new Date()).getTime(),
				reportedByUser: track.reportedByUser,
				reportedByUserId: track.reportedByUserId
			}
		);
	}
	this.sendTrackData = sendTrackData;
}
