#!/usr/bin/env node
/**
 * QUDO 서버 컨테이너 로그 stream
 * 사용: npm run server:logs [서비스명]
 *   기본: qudo-api
 *   예시: npm run server:logs qudo-postgres
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

const service = process.argv[2] || 'qudo-api';
const HOME = process.env.HOME || process.env.USERPROFILE || '';

const sshArgs = ['-o', 'StrictHostKeyChecking=accept-new'];
if (SSH_KEY) sshArgs.push('-i', SSH_KEY.replace(/^~/, HOME));

console.log(`==> ${service} 로그 (Ctrl+C 로 빠져나옴)`);
const r = spawnSync('ssh', [...sshArgs, '-t', `${SSH_USER}@${SSH_HOST}`, `docker logs -f --tail=100 ${service}`], {
  stdio: 'inherit',
  shell: false,
});
process.exit(r.status || 0);
