const child_process = require('child_process');
const fs = require('fs');
const Q = require('q');
const util = require('util');

function CommandError(cmd, status, stdout, stderr) {
  Error.call(this);
  this.message = 'Command \'' + cmd + '\' failed with status ' + status + ': ' + stderr;
  this.status = status;
  this.stdout = stdout;
  this.stderr = stderr;
}
util.inherits(CommandError, Error);

function exec() {
  const result = Q.defer();
  const cmdArgs = Array.prototype.slice.call(arguments);
  const proc = child_process.spawn(cmdArgs[0], cmdArgs.slice(1));
  let stdout = '';
  let stderr = '';
  proc.stdout.on('data', data => {
    stdout += data.toString();
  });
  proc.stderr.on('data', data => {
    stderr += data.toString();
  });
  proc.on('close', status => {
    if (status == 0) {
      result.resolve([stdout, stderr]);
    } else {
      result.reject(new CommandError(cmdArgs.join(" "), status, stdout, stderr));
    }
  });
  return result.promise;
}

module.exports = exec;
module.exports.CommandError = CommandError;
