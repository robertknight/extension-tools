// Client for the Chrome Web Store API
// See https://developer.chrome.com/webstore/using_webstore_api
//
// Usage:
// 
//   1. Use the Chrome Web Store dashboard to publish the first version
//      of your extension and get its ID
//
//   2. Follow the instructions at https://developer.chrome.com/webstore/using_webstore_api to
//      obtain access credentials for the Chrome Web Store API.
//
//      You'll need a client ID, client secret and refresh token.
//
//   3. Use getAccessToken() to get an access token for querying the API
//
//   4. Use the remaining methods to retrieve items, upload new versions of items
//      and publish new releases.

var Q = require('q');
var fs = require('fs');
var request = require('request');
var sprintf = require('sprintf');

function getAccessToken(clientId, clientSecret, refreshToken) {
	var accessTokenParams = {
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'refresh_token',
		refresh_token: refreshToken
	};

	var GOOGLE_OAUTH_TOKEN_ENDPOINT = 'https://accounts.google.com/o/oauth2/token';
	var accessToken = Q.defer();
	request.post(GOOGLE_OAUTH_TOKEN_ENDPOINT, {form: accessTokenParams}, accessToken.makeNodeResolver());
	return accessToken.promise.then(function(response) {
		var result = response[0];
		var body = response[1];

		if (result.statusCode !== 200) {
			throw new Error(sprintf('Fetching Chrome Web Store access token failed: %d %s', result.statusCode, body));
		}
		return JSON.parse(body);
	});
}

function uploadPackage(packagePath, appId, accessToken) {
	var uploaded = Q.defer();
	var packageUploadEndpoint = 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/' + appId;
	fs.createReadStream(packagePath).pipe(request.put(packageUploadEndpoint, {
		auth: { bearer: accessToken }
	}, uploaded.makeNodeResolver()));
	return uploaded.promise;
}

function publishPackage(appId, accessToken) {
	var published = Q.defer();
	var packagePublishEndpoint = 'https://www.googleapis.com/chromewebstore/v1.1/items/' + appId + '/publish';
	request.post(packagePublishEndpoint,{
		auth: { bearer: accessToken },
		form: {}
	}, published.makeNodeResolver());
	return published.promise;
}

function getPackage(appId, accessToken) {
	var fetched = Q.defer();
	var packageURL = 'https://www.googleapis.com/chromewebstore/v1.1/items/' + appId;
	request.get({
		url: packageURL,
		auth: { bearer: accessToken },
		qs: {
			projection: 'DRAFT'
		}
	}, fetched.makeNodeResolver());
	return fetched.promise;
}

module.exports = {
	getAccessToken: getAccessToken,
	getPackage: getPackage,
	uploadPackage: uploadPackage,
	publishPackage: publishPackage
};

