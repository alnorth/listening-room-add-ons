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

var changeLog = {
	"0.11.1": [
		"Improved responsiveness of charts by loading images from a different hostname.",
		"Added the option to only scrobble your own tracks.",
		"Fixed an bug that could cause a username to be stored as 'undefined' and so break the chart links for that user.",
		"Loading CSS in a different way to stop the page getting messed up when the extension updates."
	],
	"0.11": [
		"Show track lengths, courtesy of @sycobuny."
	],
	"0.10.5": [
		"Fixed a bug with track art loading."
	],
	"0.10.4": [
		"Add a loading indicator for the charts.",
		"Fixed a bug with the chart links on tracks."
	],
	"0.10.3": [
		"Add artist and track artwork on chart listings.",
		"Submit track length when sending the currently playing track to Last.fm.",
		"Fix underlining of links on the right sidebar.",
		"Added room specific links to the right sidebar."
	],
	"0.10.2": [
		"Don't show chat notifications for your own messages.",
		"Don't show desktop notifications if the LR tab is selected.",
		"Switched to using Last.fm's proper web site authorisation method.",
		"Ask for desktop notification permission up front when installing the extension."
	],
	"0.10.1": [
		"Small fix to deal with changes made to LR javascript."
	],
	"0.10": [
		"Desktop notifications for tracks and chat messages, courtesy of @Mark_Reeder."
	],
	"0.9.1": [
		"Update for data server move from port 8080 to port 80."
	],
	"0.9": [
		"Added chart display.",
		"Buttons linking to chart display for artist, user and track.",
		"Ability to set record refresh rate."
	],
	"0.8.2": [
		"Fix record spinning and album art after Abe's latest updates."
	],
	"0.8.1": [
		"Fix a bug with twitter name linking that broke the Amazon and iTunes links."
	],
	"0.8": [
		"Add the option to disable the spinning record (useful for netbooks etc.).",
		"Fetch album art for tracks in the queue as well."
	],
	"0.7.8": [
		"Made image downloading much more reliable."
	],
	"0.7.7": [
		"Turn uploader names into links."
	],
	"0.7.6": [
		"Remove option to display uploader now that Listening Room does this on its own."
	],
	"0.7.5": [
		"Revert of 0.7.4."
	],
	"0.7.4": [
		"Debugging release to try and track down errors only seen in live deployment."
	],
	"0.7.3": [
		"Added local database table of user names, populated initially from the data site.",
		"Updated the extension's icon.",
		"Made settings and change log popups larger.",
		"Moved extension links to below ads."
	],
	"0.7.2": [
		"Load data from /spins.json for sending to database.",
		"Don't delete data from local database if it hasn't been sent to the remote database yet."
	],
	"0.7.1": [
		"Fix a bug in data sending."
	],
	"0.7": [
		"Play data is sent to a remote server in order to build charts.",
		"Added http://listeningroom.fettig.net/ to the domains this can run on."
	],
	"0.6.1": [
		"Timestamps and track links are hidden unless hovered over.",
		"Twitter usernames aren't underlined until hovered over."
	],
	"0.6": [
		"Timestamps on chat messages that are posted after you enter the room.",
		"Scrolling disabled when popups are in use.",
		"A number of backend improvements to make sure track links and art are displayed as quickly as possible.",
		"Track links and art are loaded for tracks that were played while you weren't in the room."
	],
	"0.5.1": [
		"Twitter username links in the sidebar too.",
		"Fix chat hiding.",
		"Clicking outside change log and settings popups closes them."
	],
	"0.5": [
		"Turn Twitter usernames into links.",
		"Uploader name comes from DB rather than Javascript, making it more reliable when people leave the room."
	],
	"0.4.3": [
		"Modifications to the Last.fm library to make album art loading more reliable."
	],
	"0.4.2": [
		"Updated icons from @blatantsubtext."
	],
	"0.4.1": [
		"Fixed a bug that stopped track data updating if you had another tab selected."
	],
	"0.4": [
		"Uploader's name can now be displayed next to tracks.",
		"Use album art from Last.fm if there was none in the uploaded file.",
		"Updated Last.fm track link button from @blatantsubtext.",
		"Added cancel option to Last.fm log in dialog.",
		"Remove old data from the extension's database.",
		"Resolve an issue that could cause the love button to reappear after it had been clicked."
	],
	"0.3.1": [
		"Added new icon designs from @blatantsubtext.",
		"Added popup text on icons."
	],
	"0.3": [
		"Add the ability to hide chat.",
		"Fixed a bug with Last.fm track links."
	],
	"0.2.2": [
		"Default scrobbling to on."
	],
	"0.2.1": [
		"Small SQL fix."
	],
	"0.2": [
		"Settings area.",
		"Ability to disable scrobbling.",
		"Last.fm log in box submits when enter is pressed.",
		"Link to track on Last.fm.",
		"Visible scrobble status on tracks.",
		"Button to \"love\" tracks on Last.fm."
	],
	"0.1": [
		"Simple scrobbling support."
	]
};
