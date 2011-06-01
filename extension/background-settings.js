// ls - window.localStorage
function Settings(ls) {

	var defaults = {
		"hidechat": false,
		"albumart": true,
		"twitterusernamelinks": true,
		"showchattimestamps": true,
		"disablerecordspinning": false,
		
		"senddata": true,
		
		"scrobble": true,
		"lastfmlink": true,
		"showscrobblestatus": true,
		"showlastfmlovebutton": true
	};

	var set = function(key, value) {
		ls.setItem(key, value ? "true" : "false");
	};
	this.set = set;
	
	var get = function(key) {
		var value = ls.getItem(key);
		if(value) {
			return (value == "true");
		} else {
			return defaults[key];
		}
	};
	this.get = get;
	
	this.fromObject = function(o) {
		for (key in defaults) {
			if (defaults.hasOwnProperty(key)) {
				set(key, o[key]);
			} 
		}
	};
	
	this.toObject = function() {
		var o = {};
		for (key in defaults) {
			if (defaults.hasOwnProperty(key)) {
				o[key] = get(key);
			} 
		}
		return o;
	};
	
}
