/*
 *  Copyright 2018 Adobe Systems Incorporated. All rights reserved.
 *  This file is licensed to you under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License. You may obtain a copy
 *  of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under
 *  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 *  OF ANY KIND, either express or implied. See the License for the specific language
 *  governing permissions and limitations under the License.
 */

'use strict';

const path = require('path');

const express = require('express');
const fse = require('fs-extra');
const morgan = require('morgan');
// const logger = require('./logger');

const subdomainHandler = require('./subdomainHandler');
const rawHandler = require('./rawHandler');
const xferHandler = require('./xferHandler');
const blobHandler = require('./blobHandler');
const commitHandler = require('./commitHandler');
const contentHandler = require('./contentHandler');
const htmlHandler = require('./htmlHandler');

function getLogDirectory(options) {
  return path.normalize(options.logs && options.logs.logsDir || 'logs');
}

function getLogFile(options) {
  return path.join(getLogDirectory(options), 'request.log');
}

function getLogStream(options) {
  return fse.createWriteStream(getLogFile(options), { flags: 'a' });
}

function getMorganFormat(options) {
  return (options.logs && options.logs.reqLogFormat) || 'common';
}

function getMorganOptions(options) {
  return { stream: getLogStream(options) };
}

function createApp(options) {
  const app = express();

  app.disable('x-powered-by');
  app.set('title', options.appTitle || 'Helix Git Server');

  // request logger
  app.use(morgan(getMorganFormat(options), getMorganOptions(options)));

  // setup routing

  // subdomain handler (e.g. http://<subdomain>.localtest.me/foo/bar ->  /<subdomain>/foo/bar)
  app.use(subdomainHandler(options));

  // raw content handler
  app.get('/raw/:owner/:repo/:ref/*', rawHandler(options));
  app.get('/:owner/:repo/raw/:ref/*', rawHandler(options));

  // git transfer protocol handler (git clone, pull, push)
  app.use('/:owner/:repo.git*', xferHandler(options));

  // github api handlers
  app.get('/api/repos/:owner/:repo/git/blobs/:file_sha', blobHandler(options));
  app.get('/api/repos/:owner/:repo/contents/*', contentHandler(options));
  app.get('/api/repos/:owner/:repo/commits', commitHandler(options));

  // github html handlers (github-like web server)
  app.get('/:owner/:repo/blob/:ref/*', htmlHandler(options, 'blob'));
  app.get('/:owner/:repo/tree/:ref/*', htmlHandler(options, 'tree'));
  app.get('/:owner/:repo*', htmlHandler(options, 'root'));

  return app;
}
module.exports = createApp;