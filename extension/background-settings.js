// ls - window.localStorage
function Settings(ls) {

	var defaults = {
		"hidechat": false,
		"albumart": true,
		"twitterusernamelinks": true,
		"showchattimestamps": true,
		"showtracktimes": true,
		"showchatnotifications": true,
		"showsongnotifications": true,
		"notificationtimeout": 10,
		"recordrefreshrate": 40,
		
		"senddata": true,
		"showchartlinks": true,
		
		"scrobble": true,
		"onlyscrobbleowntracks": false,
		"lastfmlink": true,
		"showscrobblestatus": true,
		"showlastfmlovebutton": true
	};

	var set = function(key, value) {
		if(typeof(defaults[key]) === "number") {
			ls.setItem(key, parseInt(value, 10));
		} else {
			ls.setItem(key, value ? "true" : "false");
		}
	};
	this.set = set;
	
	var get = function(key) {
		var value = ls.getItem(key);
		if(value) {
			if(typeof(defaults[key]) === "number") {
				return value;
			} else {
				return (value === "true");
			}
		} else {
			return defaults[key];
		}
	};
	this.get = get;
	
	this.fromObject = function(o) {
		var key;
		for (key in defaults) {
			if (defaults.hasOwnProperty(key)) {
				set(key, o[key]);
			} 
		}
	};
	
	this.toObject = function() {
		var o = {};
		var key;
		for (key in defaults) {
			if (defaults.hasOwnProperty(key)) {
				o[key] = get(key);
			} 
		}
		return o;
	};
	
}
