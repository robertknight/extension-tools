# DEPRECATED

For better tools for automated signing (and in some cases publishing) of browser extensions, look at:

For Chrome: [chrome-webstore-upload-cli](https://github.com/DrewML/chrome-webstore-upload-cli)

For Firefox: [web-ext](https://github.com/mozilla/web-ext)

If you know of other tools that you would recommend, please file an issue.

----

## Browser Extension Tools

[![Build Status](https://travis-ci.org/robertknight/extension-tools.png?branch=master)](https://travis-ci.org/robertknight/extension-tools)

A collection of scripts for automated packaging and deployment
of browser extensions.

 * update-manifest-version.js automatically sets the version
   number in the manifest file for an extension with a version
   based on the length (in terms of number of commits) of
   a given branch

 * publish-chrome-extension.js uses the Google Chrome Web Store
   APIs to upload and publish an extension to the Chrome web store
