var expect = require('chai').expect;

var gitVersion = require('../src/git-version');

describe('git-version', function() {
	it('should retrieve current git version', function() {
		return gitVersion.gitVersion().then(function(version) {
			expect(version).to.match(/([0-9\.]+)-([0-9]+)-([^-]+)/);
		});
	});

	it('should convert git version to build number', function() {
		expect(gitVersion.buildVersionFromGitVersion('0.1.0-345-gA23E'))
		  .to.equal('0.1.0.345')
	});
});

