#!/bin/bash

TESTS_DIR=$(readlink -m `dirname $0`)
CHROME_EXTENSION_ARCHIVE=$TESTS_DIR/chrome.zip
CONFIG_PATH=$TESTS_DIR/chrome-extension-keys.json
CONFIG_PASSPHRASE_VAR=$1

rm -rf $CHROME_EXTENSION_ARCHIVE
(cd $TESTS_DIR/test-chrome-extension && zip $CHROME_EXTENSION_ARCHIVE *)
$TESTS_DIR/../src/publish-chrome-extension.js -p $CONFIG_PASSPHRASE_VAR $CONFIG_PATH $CHROME_EXTENSION_ARCHIVE
