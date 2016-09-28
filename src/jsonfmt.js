#!/usr/bin/env node

const fs = require('fs');
const INDENT = 2;

for (let i=2; i < process.argv.length; i++) {
	const jsonFilePath = process.argv[i];
	const content = JSON.parse(fs.readFileSync(jsonFilePath));
	fs.writeFileSync(jsonFilePath, JSON.stringify(content, null /* replacer */, INDENT) + '\n');
}
