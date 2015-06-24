#!/usr/bin/env node

'use strict';

// Utility script to publish a Google Chrome extension to the Chrome Web Store.
//
// This uses the Chrome Web Store APIs described at https://developer.chrome.com/webstore/using_webstore_api
// to upload a new .zip archive containing the extension's files to the Chrome Web Store
// and then publish the new version.
//
// Usage:
//   1. Follow steps in chrome-web-store.js to get the necessary authentication details
//
//   2. Create a config file specifying the extension ID and the
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
var Q = require('q');
var assign = require('object-assign');
var commander = require('commander');
var fs = require('fs');
var fsSync = require('fs-sync');
var request = require('request');
var os = require('os');
var semver = require('semver');
var sprintf = require('sprintf');
var JSZip = require('jszip');

var chromeWebStore = require('./chrome-web-store');
var encryptObject = require('./encrypt-object');

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

function readManifest(packagePath) {
	var archive = new JSZip(fs.readFileSync(packagePath));
	var content = archive.file('manifest.json').asText();
	return JSON.parse(content);
}

function fatalError(err) {
	console.error('Publishing to Chrome Web Store failed:', err.message, err.stack);
	process.exit(1);
}

function main(args) {
	var configPath;
	var packagePath;

	commander
	  .description('Upload a Chrome extension to the Chrome Web Store')
	  .usage('[options] <config file> <package path>')
	  .option('--require-travis-branch [branch]', 'For Travis CI builds, only publish when building from [branch]')
	  .option('-p, --passphrase-var [VAR]', 'Read encryption passphrase for the config file from the environment variable VAR')
	  .option('--autoincrement-version', 'Publish the new extension as <current version> + 0.0.1')
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

	var appManifest = readManifest(packagePath);
	var accessTokenParams = {};

	console.log('Refreshing Chrome Web Store access token...');
	return chromeWebStore.getAccessToken(clientId, clientSecret, refreshToken).then(function(_accessTokenParams) {
		console.log('Uploading updated package', packagePath);
		accessTokenParams = _accessTokenParams;
		return chromeWebStore.getPackage(appId, accessTokenParams.access_token);
	}).then(function(result) {
		var response = result[0];
		var body = JSON.parse(result[1]);
		if (body.crxVersion) {
			console.log('Existing version ', body.crxVersion);
		}

		if (!semver.valid(body.crxVersion)) {
			throw new Error(sprintf('Existing item version \'%s\' is not a valid semver version', body.crxVersion));
		}
		if (!semver.valid(appManifest.version)) {
			throw new Error(sprintf('Version in manifest \'%s\' is not a valid semver version', appManifest.version));
		}

		if (!semver.gt(appManifest.version, body.crxVersion)) {
			if (commander.autoincrementVersion) {
				// copy the original manifest to a temporary directory, auto-increment
				// the version in the manifest file and upload the result
				var newVersion = semver.inc(body.crxVersion, 'patch');
				console.log('Auto-incrementing version from %s to %s', body.crxVersion, newVersion);
				var tempPackagePath = os.tmpdir() + '/' + appId + '.zip';

				// read original package, update manifest
				var newManifest = assign({}, appManifest, {version: newVersion});
				var tempArchive = new JSZip(fs.readFileSync(packagePath));
				tempArchive.file('manifest.json', JSON.stringify(newManifest, null, 2));

				// write out updated package
				var tempArchiveData = tempArchive.generate({type: 'nodebuffer'});
				fs.writeFileSync(tempPackagePath, tempArchiveData);

				packagePath = tempPackagePath;
			} else {
				throw new Error(sprintf('Input version \'%s\' is <= current version on Chrome Web Store (\'%s\')',
				  appManifest.version, body.crxVersion));
			}
		}

		return chromeWebStore.uploadPackage(packagePath, appId, accessTokenParams.access_token);
	}).then(function(result) {
		var response = result[0];
		var body = result[1];

		if (response.statusCode !== 200) {
			throw new Error(sprintf('Package upload failed: %d %s', response.statusCode, body));
		}
		var uploadResult = JSON.parse(body);
		if (uploadResult.uploadState == 'FAILURE') {
			var currentVersionRegex = /larger version in file manifest.json than the published package: ([0-9.]+)/;
			if (uploadResult.itemError) {
				throw new Error(sprintf('Package upload error: %s', JSON.stringify(uploadResult)));
			}
		} else {
			console.log('Publishing updated package', appId);
			return chromeWebStore.publishPackage(appId, accessTokenParams.access_token);
		}
	}).then(function(result) {
		var response = result[0];
		var body = result[1];
		if (response.statusCode !== 200) {
			throw new Error(sprintf('Publishing updated package failed: %d %s', response.statusCode, body));
		}
		var publishResult = JSON.parse(body);
		if (publishResult.itemError) {
			throw new Error(sprintf('Package publish error: %s', JSON.stringify(publishResult)));
		}
		console.log('Updated package has been queued for publishing');
	}).catch(function(err) {
		console.error('Publishing updated package failed: %s', err);
		fatalError(err);
	});
}

try {
	process.on('uncaughtException', fatalError);
	main(process.argv);
} catch (err) {
	fatalError(err);
}

