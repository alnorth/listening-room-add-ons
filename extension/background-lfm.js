function LastFmInterface(ls) {

	var lastfm = new LastFM({
		apiKey    : lastfmApiKey, // loaded from constants.js
		apiSecret : lastfmApiSecret
	});
	var lastfmSession = false;
	if(ls) {
		lastfmSession = ls.getObject("lastfmsession");
	}
	
	var callCallback = function(callback) {
		return function() {
			if(callback) {
				callback();
			}
		};
	};
	
	this.clearSession = function() {
		lastfmSession = false;
		ls.removeItem("lastfmsession");
	};
	
	this.signedIn = function() {
		return lastfmSession !== false;
	};
	
	this.exchangeToken = function(token, errCallback, callback) {
		lastfm.auth.getSession({token: token}, {
			success: function(data){
				lastfmSession = data.session;
				ls.setObject("lastfmsession", lastfmSession);
				if(callback) {
					callback();
				}
			},
			error: errCallback
		});
	};
	
	this.getTrackUrl = function(artist, title, callback) {
		lastfm.track.getInfo({artist: artist, track: title}, {
			success: function(data){
				callback(data.track.url);
			},
			error: function(code, message){
				var newUrl = "none";
				if(title !== "") {
					newUrl = "http://www.last.fm/search?" + $.param({q: title + " - " + artist});
				}
				callback(newUrl);
			}
		});
	};
	
	this.loveTrack = function(artist, title, errCallback, callback) {
		lastfm.track.love({artist: artist, track: title}, lastfmSession, {success: callCallback(callback), error: errCallback});
	};
	
	this.scrobble = function(artist, title, album, jsTimestamp, errCallback, callback) {
		var timestamp = Math.round(jsTimestamp / 1000);
		lastfm.track.scrobble({track: title, timestamp: timestamp, artist: artist, album: album}, lastfmSession, {success: callCallback(callback), error: errCallback});
	};
	
	this.setNowPlaying = function(artist, title, album, length, errCallback, callback) {
		lastfm.track.updateNowPlaying({track: title, artist: artist, album: album, duration: length}, lastfmSession, {success: callCallback(callback), error: errCallback});
	};
	
	this.getArtistData = function(artist, errCallback, callback) {
		lastfm.artist.getInfo({artist: artist}, {success: callCallback(callback), error: errCallback});
	};
}
