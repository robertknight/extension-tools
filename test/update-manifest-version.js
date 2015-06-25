var fs = require('fs');
var expect = require('chai').expect;

var exec = require('../src/exec');

describe('update-manifest-version', function() {
	it('sets manifest version from Git tag', function() {
		var tempManifestPath = '/tmp/test.json';
		var testFile = fs.writeFileSync(tempManifestPath, JSON.stringify({
			version: '0.1.0'
		}));
		return exec('node', __dirname + '/../src/update-manifest-version', tempManifestPath).then(function() {
			var updatedManifest = JSON.parse(fs.readFileSync(tempManifestPath));
			expect(updatedManifest.version).to.match(/([0-9]+\.){3}[0-9]+/);
		});
	});
});
