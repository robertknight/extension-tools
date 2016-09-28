#!/usr/bin/env node

const commander = require('commander');
const fs = require('fs');

const exec = require('./exec');
const gitVersion = require('./git-version');

function setVersionKey(manifestPath, newVersion) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath).toString());
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null /* replacer */, 2) + '\n')
}

/// Returns the name of the currently checked-out Git branch or null
/// if HEAD is not a Git branch.
function gitBranch() {
  return exec('git', 'symbolic-ref', '--short', '--quiet', 'HEAD').then(result => result[0].trim()).catch(err => {
    if (err instanceof exec.CommandError && err.status == 1) {
      // detached HEAD, return null to represent an unknown branch
      return null;
    } else {
      throw err;
    }
  });
}

function main() {
  let manifestPath;
  commander
    .description('Set the \'version\' field in a Chrome or Firefox extension manifest')
    .usage('[options] <manifest path>')
    .option('--require-branch [BRANCH]', 'Verify that the current Git branch is [BRANCH]')
    .action(_manifestPath => {
      manifestPath = _manifestPath;
    });
  commander.parse(process.argv);

  if (!manifestPath) {
    throw new Error('Manifest path not specified');
  }

  gitBranch().then(branch => {
    if (commander.requireBranch && commander.requireBranch !== branch) {
      throw new Error('Current branch ' + branch + ' does not match ' + commander.requireBranch);
    }
    return gitVersion.gitVersion();
  }).then(version => {
    const buildVersion = gitVersion.buildVersionFromGitVersion(version);
    console.log('Setting version to "%s"', buildVersion);
    setVersionKey(manifestPath, buildVersion);
  }).done();
}

module.exports = {
  setVersionKey: setVersionKey
};

if (require.main === module) {
  main();
}
