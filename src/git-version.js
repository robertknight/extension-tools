#!/usr/bin/env node

const fs = require('fs');
const Q = require('q');

const exec = require('./exec');

// Update the 'version' field in a JSON manifest
// file based on the number of commits since
// the initial commit in the repository.

// This emulates SVN-like revision numbers in Git,
// although this only works provided that
// all commits are made from the same branch and
// that the branch head only changes via addition
// of new commits.
//
// This also requires full Git history in the local
// repository. The script will convert the current
// repository from a shallow to full clone if necessary
// before upating the manifest.

function convertShallowToFullClone() {
  if (fs.existsSync('.git/shallow')) {
    return exec('git', 'fetch', '--unshallow');
  } else {
    return Q();
  }
}

// Returns the length of the commit history on the current Git
// branch
function getLinearHistoryLength() {
  return convertShallowToFullClone().then(() => exec('git', 'log', '--format="%h"')).then(result => {
    const status = result[0];
    const commitList = result[1];
    const commits = commitList.trim().split('\n');
    return commits.length;
  });
}

// Returns the version of the current branch using 'git describe --tags --long'
function gitVersion() {
  return convertShallowToFullClone().then(() => exec('git', 'describe', '--tags', '--long')).then(result => result[0].trim());
}

// takes a version number produced by git describe of the form
// $TAG-$COMMITS_SINCE_TAG-g$HASH (see http://hermanradtke.com/2010/02/05/canonical-version-numbers-with-git.html)
// and produces a build number of the form 'MAJOR.MINOR.PATCH.BUILD' where
// 'MAJOR', 'MINOR' and 'PATCH' are taken from the '$TAG' and '$BUILD'
// is set to the number of commits since the tag
function buildVersionFromGitVersion(gitVersion) {
  const gitVersionParts = gitVersion.match(/([0-9\.]+)-([0-9]+)-([^-]+)/);
  if (!gitVersionParts) {
    throw new Error(gitVersion.toString() + ' is not of the expected form $TAG-$COMMITS_SINCE_TAG-g$HASH');
  }
  return [gitVersionParts[1], gitVersionParts[2]].join('.');
}

module.exports = {
  buildVersionFromGitVersion,
  gitVersion
};
