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

const Git = require('nodegit');

/**
 * Export the api handler (express middleware) through a parameterizable function
 *
 * @param {object} options configuration hash
 * @returns {function(*, *, *)} handler function
 */
module.exports = function (options) {
  /**
   * Express middleware handling Git API Blob requests
   *
   * Only a small subset will be implemented
   *
   * @param {Request} req Request object
   * @param {Response} res Response object
   * @param {callback} next next middleware in chain
   *
   * @see hhttps://developer.github.com/v3/git/blobs/#get-a-blob
   */
  return (req, res, next) => {
    // GET /repos/:owner/:repo/blobs/:file_sha
    const owner = req.params.owner;
    const repoName = req.params.repo;
    const sha = req.params.file_sha;
    const host = req.mappedSubDomain ? `localhost:${options.listen[req.protocol].port}` : req.headers.host;

    const repPath = path.resolve(options.repoRoot, owner, repoName);
    let _repo;
    Git.Repository.open(repPath)
      .then(repo => {
        _repo = repo;
        return _repo.getBlob(sha);
      })
      .then(blob => {
        res.json({
          sha: sha,
          size: blob.rawsize(),
          url: `${req.protocol}://${host}${req.path}`,
          content: blob.content().toString('base64') + '\n',
          encoding: 'base64'
        });
      })
      .catch(err => {
        // TODO return specific status (404, 500, etc)
        next(err);
      })
      .finally(() => {
        // TODO cache Repository instances (key: absolute path)
        _repo.free();
      });
  };
};