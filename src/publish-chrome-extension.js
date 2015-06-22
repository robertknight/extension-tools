#!/usr/bin/env node

'use strict';

// Utility script to publish a Google Chrome extension to the Chrome Web Store.
//
// This uses the Chrome Web Store APIs described at https://developer.chrome.com/webstore/using_webstore_api
// to upload a new .zip archive containing the extension's files to the Chrome Web Store
// and then publish the new version.
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
//   3. Create a config file specifying the extension ID and the
//      OAuth keys:
//
//   {
//   	"client_id" : "<client ID>",
//   	"client_secret" : "<client secret>",
//   	"refresh_token" : "<refresh token>",
//   	"app_id" : "<ID>"
//   }
//
//   4. Run 'publish-chrome-extension.js <path/to/config.js> <path/to/package.zip>'
//   
//     publish-chrome-extension.js <path/to/package.zip>
//
// # Usage in Travis CI
//
// When publishing from a Travis CI build, this script can be configured to only
// publish the extension if building from a specific branch (eg. 'master')
//
var commander = require('commander');
var fs = require('fs');
var request = require('request');
var sprintf = require('sprintf');
var encryptObject = require('./encrypt-object');
var Q = require('q');

var GOOGLE_OAUTH_TOKEN_ENDPOINT = 'https://accounts.google.com/o/oauth2/token';

function requireEnvVar(name) {
	var val = process.env[name];
	if (typeof val !== 'string') {
		throw new Error(sprintf('Required environment variable %s is not set', name));
	}
	return val;
}

function requireKey(obj, key) {
	if (!obj[key]) {
		throw new Error('Required key \'%s\' not found in config');
	}
	return obj[key];
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

function main(args) {
	var configPath;
	var packagePath;

	commander
	  .description('Upload a Chrome extension to the Chrome Web Store')
	  .usage('[options] <config file> <package path>')
	  .option('--require-travis-branch [branch]', 'For Travis CI builds, only publish when building from [branch]')
	  .option('-p, --passphrase-var [VAR]', 'Read encryption passphrase for the config file from the environment variable VAR')
	  .action(function(_configPath, _packagePath) {
		  configPath = _configPath;
		  packagePath = _packagePath;
	  });
	commander.parse(args);

	if (!packagePath) {
		throw new Error('Package path not specified');
	}
	if (!configPath) {
		throw new Error('Config path not specified');
	}

	var config = JSON.parse(fs.readFileSync(configPath));
	if (commander.passphraseVar) {
		var passphrase = requireEnvVar(commander.passphraseVar);
		config = encryptObject.decryptObject(config, passphrase, encryptObject.DEFAULT_ITERATIONS);
	}

	var appId = requireKey(config, 'app_id');
	var clientId = requireKey(config, 'client_id');
	var clientSecret = requireKey(config, 'client_secret');
	var refreshToken = requireKey(config, 'refresh_token');

	if (commander.requireTravisBranch) {
		var travisBranch = requireEnvVar('TRAVIS_BRANCH');
		var travisPullRequest = requireEnvVar('TRAVIS_PULL_REQUEST');
		if (travisBranch !== commander.requireTravisBranch || travisPullRequest !== 'false') {
			console.log('Current branch \'%s\' does not match \'%s\'. Skipping upload.',
			  travisBranch, commander.requireTravisBranch);
			return;
		}
	}

	var accessTokenParams = {
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'refresh_token',
		refresh_token: refreshToken
	};

	console.log('Refreshing Chrome Web Store access token...');
	request.post(GOOGLE_OAUTH_TOKEN_ENDPOINT,
				 {form : accessTokenParams},
				 function(err, response, body) {
		if (err || response.statusCode !== 200) {
			throw new Error(sprintf('Fetching Chrome Web Store access token failed: %d %s', response.statusCode, body));
		}

		var accessTokenParams = JSON.parse(body);

		console.log('Uploading updated package', packagePath);
		var upload = uploadPackage(packagePath, appId, accessTokenParams.access_token);

		return upload.then(function(result) {
			var response = result[0];
			var body = result[1];

			if (response.statusCode !== 200) {
				throw new Error(sprintf('Package upload failed: %d %s', response.statusCode, body));
			}
			var uploadResult = JSON.parse(body);
			if (uploadResult.uploadState == 'FAILURE') {
				var currentVersionRegex = /larger version in file manifest.json than the published package: ([0-9.]+)/;
				if (uploadResult.itemError.error_code == 'PKG_INVALID_VERSION_NUMBER') {
					// TODO - Bump manifest version and retry upload
				} else {
					throw new Error(sprintf('Package upload error: %s', JSON.stringify(uploadResult)));
				}
			} else {
				console.log('Publishing updated package', appId);
				return publishPackage(appId, accessTokenParams.access_token);
			}
		}).then(function(result) {
			var response = result[0];
			var body = result[1];
			if (err || response.statusCode !== 200) {
				throw new Error(sprintf('Publishing updated package failed: %d %s', response.statusCode, body));
			}
			var publishResult = JSON.parse(body);
			console.log('Updated package has been queued for publishing');
		}).catch(function(err) {
			console.error('Publishing updated package failed: %s', err);
			throw err;
		});
	});
}

var onErr = function(err) {
	console.error('Publishing to Chrome Web Store failed:', err.message, err.stack);
	process.exit(1);
};
process.on('uncaughtException', onErr);

try {
	main(process.argv);
} catch (err) {
	onErr(err);
}

