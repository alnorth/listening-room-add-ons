function LastFmInterface() {

	var lastfm = new LastFM({
		apiKey    : 'c0db7c8bfb98655ab25aa2e959fdcc68',
		apiSecret : 'aff4890d7cb9492bc72250abbeffc3e1'
	});
	var lastfmSession;
	
	var callCallback = function(callback) {
		return function() {
			if(callback) {
				callback();
			}
		};
	};
	
	var urlEncodeCharacter = function(c) {
		return '%' + c.charCodeAt(0).toString(16);
	};

	var urlEncode = function(s) {
		return encodeURIComponent(s).replace(/\%20/g, '+').replace(/[!'()*~]/g, urlEncodeCharacter);
	};
	
	this.clearSession = function() {
		lastfmSession = undefined;
	};
	
	this.signedIn = function() {
		return typeof(lastfmSession) !== "undefined";
	};
	
	this.signIn = function(username, password, errCallback, callback) {
		lastfm.auth.getMobileSession({username: username, password: password}, {
			success: function(data){
				lastfmSession = data.session;
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
					newUrl = "http://www.last.fm/search?q=" + urlEncode(title + " - " + artist);
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
	
	this.setNowPlaying = function(artist, title, album, errCallback, callback) {
		lastfm.track.updateNowPlaying({track: title, artist: artist, album: album}, lastfmSession, {success: callCallback(callback), error: errCallback});
	};
}
