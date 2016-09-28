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
const Q = require('q');
const assign = require('object-assign');
const commander = require('commander');
const fs = require('fs');
const fsSync = require('fs-sync');
const request = require('request');
const os = require('os');
const sprintf = require('sprintf');
const JSZip = require('jszip');

const chromeWebStore = require('./chrome-web-store');
const extensionVersion = require('./extension-version');
const encryptObject = require('./encrypt-object');

function requireEnvVar(name) {
  const val = process.env[name];
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
  const archive = new JSZip(fs.readFileSync(packagePath));
  const content = archive.file('manifest.json').asText();
  return JSON.parse(content);
}

function fatalError(err) {
  console.error('Publishing to Chrome Web Store failed:', err.message, err.stack);
  process.exit(1);
}

function main(args) {
  let configPath;
  let packagePath;

  commander
    .description('Upload a Chrome extension to the Chrome Web Store')
    .usage('[options] <config file> <package path>')
    .option('--require-travis-branch [branch]', 'For Travis CI builds, only publish when building from [branch]')
    .option('-p, --passphrase-var [VAR]', 'Read encryption passphrase for the config file from the environment variable VAR')
    .option('--autoincrement-version', 'Publish the extension as <current version> + 0.0.1')
    .option('--set-version [VERSION]', 'Publish the extension with the given VERSION')
    .action((_configPath, _packagePath) => {
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

  let config = JSON.parse(fs.readFileSync(configPath));
  if (commander.passphraseVar) {
    const passphrase = requireEnvVar(commander.passphraseVar);
    config = encryptObject.decryptObject(config, passphrase, encryptObject.DEFAULT_ITERATIONS);
  }

  const appId = requireKey(config, 'app_id');
  const clientId = requireKey(config, 'client_id');
  const clientSecret = requireKey(config, 'client_secret');
  const refreshToken = requireKey(config, 'refresh_token');

  if (commander.requireTravisBranch) {
    const travisBranch = requireEnvVar('TRAVIS_BRANCH');
    const travisPullRequest = requireEnvVar('TRAVIS_PULL_REQUEST');
    if (travisBranch !== commander.requireTravisBranch || travisPullRequest !== 'false') {
      console.log('Current branch \'%s\' does not match \'%s\'. Skipping upload.',
        travisBranch, commander.requireTravisBranch);
      return;
    }
  }

  const appManifest = readManifest(packagePath);
  let accessTokenParams = {};

  console.log('Refreshing Chrome Web Store access token...');
  return chromeWebStore.getAccessToken(clientId, clientSecret, refreshToken).then(_accessTokenParams => {
    console.log('Uploading updated package', packagePath);
    accessTokenParams = _accessTokenParams;
    return chromeWebStore.getPackage(appId, accessTokenParams.access_token);
  }).then(result => {
    const response = result[0];
    const body = JSON.parse(result[1]);
    if (body.crxVersion) {
      console.log('Current version on store: \'%s\'', body.crxVersion);
    }

    if (!extensionVersion.isValid(body.crxVersion)) {
      throw new Error(sprintf('Existing item version \'%s\' is not a valid Chrome extension version', body.crxVersion));
    }
    if (!extensionVersion.isValid(appManifest.version)) {
      throw new Error(sprintf('Version in manifest \'%s\' is not a valid Chrome extension version', appManifest.version));
    }

    const isManifestVersionNewer = extensionVersion.lessThan(body.crxVersion, appManifest.version);
    if ((!isManifestVersionNewer && commander.autoincrementVersion) || commander.setVersion) {
      let newVersion;

      // copy the original manifest to a temporary directory, auto-increment
      // the version in the manifest file and upload the result
      if (commander.autoincrementVersion) {
        newVersion = extensionVersion.increment(body.crxVersion, 3);
      } else if (commander.setVersion) {
        newVersion = commander.setVersion;
        if (!extensionVersion.isValid(newVersion)) {
          throw new Error(sprintf('Version number \'%s\' specified with --set-version is not a valid Chrome extension version',
            newVersion));
        }
      }
      console.log('Setting new version to \'%s\'', newVersion);

      const tempPackagePath = os.tmpdir() + '/' + appId + '.zip';

      // read original package, update manifest
      const newManifest = assign({}, appManifest, { version: newVersion });
      const tempArchive = new JSZip(fs.readFileSync(packagePath));
      tempArchive.file('manifest.json', JSON.stringify(newManifest, null, 2));

      // write out updated package
      const tempArchiveData = tempArchive.generate({ type: 'nodebuffer' });
      fs.writeFileSync(tempPackagePath, tempArchiveData);

      packagePath = tempPackagePath;
    } else if (!isManifestVersionNewer) {
      throw new Error(sprintf('Input version \'%s\' is <= current version on Chrome Web Store (\'%s\')',
        appManifest.version, body.crxVersion));
    }

    return chromeWebStore.uploadPackage(packagePath, appId, accessTokenParams.access_token);
  }).then(result => {
    const response = result[0];
    const body = result[1];

    if (response.statusCode !== 200) {
      throw new Error(sprintf('Package upload failed: %d %s', response.statusCode, body));
    }
    const uploadResult = JSON.parse(body);
    if (uploadResult.uploadState == 'FAILURE') {
      const currentVersionRegex = /larger version in file manifest.json than the published package: ([0-9.]+)/;
      if (uploadResult.itemError) {
        throw new Error(sprintf('Package upload error: %s', JSON.stringify(uploadResult)));
      }
    } else {
      console.log('Publishing updated package', appId);
      return chromeWebStore.publishPackage(appId, accessTokenParams.access_token);
    }
  }).then(result => {
    const response = result[0];
    const body = result[1];
    if (response.statusCode !== 200) {
      throw new Error(sprintf('Publishing updated package failed: %d %s', response.statusCode, body));
    }
    const publishResult = JSON.parse(body);
    if (publishResult.itemError) {
      throw new Error(sprintf('Package publish error: %s', JSON.stringify(publishResult)));
    }
    console.log('Updated package has been queued for publishing');
  }).catch(err => {
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
