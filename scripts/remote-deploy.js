#!/usr/bin/env node
/**
 * QUDO 재배포 (GHCR pull + restart + 로그 stream)
 * 사용: npm run server:deploy
 */
'use strict';

const fs = require('fs');
const { spawnSync } = require('child_process');

if (!fs.existsSync('.deploy.env')) {
  console.error('ERROR: .deploy.env 가 없습니다.');
  process.exit(1);
}
require('dotenv').config({ path: '.deploy.env' });

const { SSH_HOST, SSH_USER, SSH_KEY } = process.env;
if (!SSH_HOST || !SSH_USER) {
  console.error('ERROR: SSH_HOST / SSH_USER 가 .deploy.env 에 없습니다.');
  process.exit(1);
}

const REMOTE = `${SSH_USER}@${SSH_HOST}`;
const REMOTE_DIR = `/home/${SSH_USER}/qudo-api`;
const HOME = process.env.HOME || process.env.USERPROFILE || '';

const sshArgs = ['-o', 'StrictHostKeyChecking=accept-new'];
if (SSH_KEY) sshArgs.push('-i', SSH_KEY.replace(/^~/, HOME));

function run(args, opts = {}) {
  const r = spawnSync('ssh', [...sshArgs, ...args], { stdio: 'inherit', shell: false, ...opts });
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log('==> GHCR pull + qudo-api 재기동');
run([REMOTE,
  `cd ${REMOTE_DIR} && ` +
  `docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env pull && ` +
  `docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env up -d && ` +
  `docker image prune -f`,
]);

console.log('\n==> 로그 (Ctrl+C 로 빠져나옴)');
run(['-t', REMOTE, 'docker logs -f --tail=50 qudo-api']);
