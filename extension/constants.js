var lastfmStatus = {
	SCROBBLING_DISABLED: -1,
	UNSENT: 0,
	PLAYING_SENT: 1,
	WAITING_FOR_SCROBBLING: 2,
	SCROBBLED: 3
};

var lastfmLovedStatus = {
	LOVE_SENT: 1,
	LOVE_ACKNOWLEDGED: 2
};

var lastfmApiKey = "c0db7c8bfb98655ab25aa2e959fdcc68";
var lastfmApiSecret = "aff4890d7cb9492bc72250abbeffc3e1";

Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key) {
    return this.getItem(key) !== null && JSON.parse(this.getItem(key));
};

var roomSpecificLinks = {
	"4d6f04d78dc336ba42000005": [
		{url: "http://typetochat.me", text: "Type to chat"},
		{url: "http://qwantzlistens.tumblr.com", text: "Tumblr"},
		{url: "http://typetochat.me/poll", text: "HDJ Poll"},
		{url: "http://typetochat.me/wiki/", text: "Wiki"}
	]
};