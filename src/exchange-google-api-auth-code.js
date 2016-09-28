#!/usr/bin/env node

// Utility script for exchanging an authorization code for
// a refresh token as described in https://developer.chrome.com/webstore/using_webstore_api
const commander = require('commander');
const request = require('request');

const GOOGLE_OAUTH_TOKEN_ENDPOINT = 'https://accounts.google.com/o/oauth2/token';

function getRefreshTokenFromAuthCode(clientId, clientSecret, authCode) {
  const authTokenParams = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
  };
  request.post(GOOGLE_OAUTH_TOKEN_ENDPOINT, { form: authTokenParams }, (err, response, body) => {
    console.log('%s', JSON.stringify(body, null, 2));
  });
}

commander
  .description('Exchange a Google API authorization code for access and refresh tokens')
  .usage('<client ID> <client secret> <auth code>')
  .action((clientId, clientSecret, authCode) => {
    console.log('Client ID: %s', clientId);
    console.log('Client Secret: %s', clientSecret);
    console.log('Auth Code: %s', authCode);
    getRefreshTokenFromAuthCode(clientId, clientSecret, authCode);
  });
commander.parse(process.argv);
