function Database() {
	var webDb = openDatabase("listeningroom-addons-data", "", "Listening Room Addons data", 1048576);
	
	var undefinedToBlank = function(val) {
		return val ? val : '';
	};
	
	var ignore = function() {};
	
	var logError = function(tx, error) {
		console.log("SQL error: " + error.message);
	};
	
	var callCallback = function(callback) {
		return function(tx, rs) {
			if(callback) {
				callback();
			}
		};
	};
	
	var update = function(tx, currentVersion) {
		if(currentVersion === 0) {
			tx.executeSql('insert into DB_DATA(version) values (1)', [], ignore, logError);
			tx.executeSql('alter table TRACK_PLAY add column lastfm_loved int', [], ignore, logError);
			currentVersion = 1;
		}
		if(currentVersion === 1) {
			tx.executeSql('alter table TRACK_PLAY add column album_art text', [], ignore, logError);
			tx.executeSql('update DB_DATA set version = 2', [], ignore, logError);
			currentVersion = 2;
		}
		if(currentVersion === 2) {
			tx.executeSql('alter table TRACK_PLAY add column user_id text', [], ignore, logError);
			tx.executeSql('alter table TRACK_PLAY add column room text', [], ignore, logError);
			tx.executeSql('update DB_DATA set version = 3', [], ignore, logError);
			currentVersion = 3;
		}
		if(currentVersion === 3) {
			tx.executeSql('alter table TRACK_PLAY add column reported_by_user text', [], ignore, logError);
			tx.executeSql('alter table TRACK_PLAY add column reported_by_user_id text', [], ignore, logError);
			tx.executeSql('alter table TRACK_PLAY add column send_data int', [], ignore, logError);
			tx.executeSql('update TRACK_PLAY set send_data = 0', [], ignore, logError);
			tx.executeSql('alter table TRACK_PLAY add column data_track_id int', [], ignore, logError);
			tx.executeSql('alter table TRACK_PLAY add column data_artist_id int', [], ignore, logError);
			tx.executeSql('alter table TRACK_PLAY add column data_play_id int', [], ignore, logError);
			tx.executeSql('update DB_DATA set version = 4', [], ignore, logError);
			currentVersion = 4;
		}
		if(currentVersion === 4) {
			tx.executeSql('create table if not exists USER(id text, username text)', [], ignore, logError);
			tx.executeSql('update DB_DATA set version = 5', [], ignore, logError);
			currentVersion = 5;
		}
	};
	
	var init = function() {
		webDb.transaction(function(tx) {
			tx.executeSql('create table if not exists TRACK_PLAY ' +
				'(id text, artist text, title text, album text, date int, lastfm_status int, lastfm_url text)', [], ignore, logError);
				
			tx.executeSql('create table if not exists DB_DATA(version int)', [], ignore, logError);
				
			tx.executeSql('SELECT version FROM DB_DATA', [], function(tx, rs) {
				if(rs.rows.length === 0) {
					update(tx, 0);
				} else {
					update(tx, parseInt(rs.rows.item(0).version, 10));
				}
			}, logError);
			
			// Delete all tracks over a day old.
			// We don't delete tracks that still need to be scrobbled or sent to the data server.
			var now = (new Date()).getTime();
			var yesterday = now - 24*60*60*1000;
			tx.executeSql('delete from TRACK_PLAY where date < ? and lastfm_status <> ? and (send_data = 0 or artist = "" or title = "" or data_play_id is not null)', [yesterday, lastfmStatus.WAITING_FOR_SCROBBLING], ignore, logError);
		});
	};
	
	// This one is called by addTrackToDB in a database callback, so we need to be able to refrence it without using "this".
	var setUserData = function(id, username, errCallback, callback) {
		webDb.transaction(function(tx) {
			tx.executeSql('select username from USER where id = ?', [id], function(tx, rs) {
				if(rs.rows.length === 1) {
					if(!rs.rows.item(0).username || rs.rows.item(0).username === "") {
						tx.executeSql('update USER set username = ? where id = ?', [username, id], callCallback(callback), errCallback);
					}
				} else {
					tx.executeSql('insert into USER(id, username) values (?, ?)', [id, username], callCallback(callback), errCallback);
				}
			}, errCallback);
		});
	};
	this.setUserData = setUserData;
	
	this.addTrackToDB = function(trackData, isCurrent, scrobbling, sendData, errCallback) {
		webDb.transaction(function(tx) {
			tx.executeSql('select count(*) as num from TRACK_PLAY where id = ?', [trackData.id], function(tx2, rs) {
					if(parseInt(rs.rows.item(0).num, 10) === 0) {
						setUserData(trackData.userId, trackData.user, errCallback, ignore);
						tx2.executeSql('insert into TRACK_PLAY ' +
							'(id, artist, title, album, date, lastfm_status, lastfm_url, user_id, room, reported_by_user, reported_by_user_id, send_data)' + 
							'values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
							[trackData.id,
								undefinedToBlank(trackData.artist),
								undefinedToBlank(trackData.title),
								undefinedToBlank(trackData.album),
								trackData.timestamp,
								scrobbling && isCurrent ? lastfmStatus.UNSENT : lastfmStatus.SCROBBLING_DISABLED,
								'',
								trackData.userId,
								trackData.room,
								trackData.reportedByUser,
								trackData.reportedByUserId,
								sendData ? 1 : 0
							],
							ignore, errCallback);
					}
				}, errCallback);
		});
	};
	
	this.setPastTracksToScrobbleable = function(currentTrackId, errCallback) {
		webDb.transaction(function(tx) {
			tx.executeSql('update TRACK_PLAY set lastfm_status = ? where lastfm_status = ? and id <> ?', [lastfmStatus.WAITING_FOR_SCROBBLING, lastfmStatus.PLAYING_SENT, currentTrackId], ignore, errCallback);
		});
	};
	
	this.saveLastfmUrl = function(trackId, url, errCallback, callback) {
		webDb.transaction(function(tx) {
			tx.executeSql('update TRACK_PLAY set lastfm_url = ? where id = ?', [url, trackId], callCallback(callback), errCallback);
		});
	};
	
	this.getTrackInfo = function(trackId, errCallback, callback) {
		webDb.transaction(function(tx) {
			tx.executeSql('select lastfm_status, lastfm_url, lastfm_loved, title, artist, album, user_id, u.username from TRACK_PLAY p join USER u on u.id = p.user_id where p.id = ?', [trackId], function(tx, rs) {
				if(rs.rows.length === 1) {
					callback(rs.rows.item(0));
				}
			}, errCallback);
		});
	};
	
	this.saveLovedStatus = function(trackId, status, errCallback, callback) {
		webDb.transaction(function(tx) {
			tx.executeSql('update TRACK_PLAY set lastfm_loved = ? where id = ?', [status, trackId], callCallback(callback), errCallback);
		});
	};
	
	this.saveLastFmStatus = function(trackId, status, errCallback, callback) {
		webDb.transaction(function(tx) {
			tx.executeSql('update TRACK_PLAY set lastfm_status = ? where id = ?', [status, trackId], callCallback(callback), errCallback);
		});
	};
	
	this.getOldestScrobbleableTrack = function(errCallback, callback) {
		webDb.transaction(function(tx) {
			tx.executeSql('select id, artist, title, album, date from TRACK_PLAY where lastfm_status = ? order by date limit 1', [lastfmStatus.WAITING_FOR_SCROBBLING], function(tx, rs) {
				if(rs.rows.length === 1) {
					callback(rs.rows.item(0));
				}
			}, errCallback);
		});
	};
	
	this.getOldestUnsentData = function(errCallback, callback) {
		webDb.transaction(function(tx) {
			tx.executeSql('select p.id, artist, title, album, user_id, room, date, reported_by_user, reported_by_user_id, u.username from TRACK_PLAY p join USER u on u.id = p.user_id where send_data = 1 and artist <> "" and title <> "" and data_play_id is null order by date limit 1', [], function(tx, rs) {
				if(rs.rows.length === 1) {
					callback(rs.rows.item(0));
				}
			}, errCallback);
		});
	};
	
	this.saveLRDBData = function(trackId, data, errCallback, callback) {
		webDb.transaction(function(tx) {
			tx.executeSql('update TRACK_PLAY set data_track_id = ?, data_artist_id = ?, data_play_id = ? where id = ?', [data.trackId, data.artistId, data.playId, trackId], callCallback(callback), errCallback);
		});
	};
	
	init();
}
