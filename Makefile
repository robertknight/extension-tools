test: unit-tests test-chrome-ext-upload

unit-tests:
	./node_modules/.bin/mocha

# Test Chrome extension upload. This requires the passphrase
# for tests/chrome-extension-keys.js to be exported via the
# TRAVIS_KEYS_PASSPHRASE env var
#
test-chrome-ext-upload:
	./test/test-publish-chrome-extension.sh TRAVIS_KEYS_PASSPHRASE
