#!/usr/bin/env node
/**
 * QUDO 원격 서버 초기 세팅 (Node.js)
 * 사용: npm run server:setup
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ---- .deploy.env 로드 ----
if (!fs.existsSync('.deploy.env')) {
  console.error('ERROR: .deploy.env 가 없습니다.');
  console.error('       cp .deploy.env.example .deploy.env 후 값 채우세요.');
  process.exit(1);
}
require('dotenv').config({ path: '.deploy.env' });

const SSH_HOST = process.env.SSH_HOST;
const SSH_USER = process.env.SSH_USER;
const SSH_KEY = process.env.SSH_KEY;
const GHCR_USER = process.env.GHCR_USER;
const GHCR_PAT = process.env.GHCR_PAT;

const required = { SSH_HOST, SSH_USER, GHCR_USER, GHCR_PAT };
for (const [k, v] of Object.entries(required)) {
  if (!v) {
    console.error(`ERROR: ${k} 가 .deploy.env 에 없습니다.`);
    process.exit(1);
  }
}

if (!fs.existsSync('.env')) {
  console.error('ERROR: .env 가 프로젝트 루트에 없습니다.');
  process.exit(1);
}

// ---- SSH 옵션 ----
const REMOTE = `${SSH_USER}@${SSH_HOST}`;
const REMOTE_DIR = `/home/${SSH_USER}/qudo-api`;
const HOME = process.env.HOME || process.env.USERPROFILE || '';

const sshArgs = ['-o', 'StrictHostKeyChecking=accept-new'];
if (SSH_KEY) {
  const expanded = SSH_KEY.replace(/^~/, HOME);
  sshArgs.push('-i', expanded);
}

// ---- helpers ----
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    console.error(`\nFAILED: ${cmd} ${args.join(' ')}`);
    process.exit(r.status || 1);
  }
}

function runSilent(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'pipe', shell: false });
  return {
    code: r.status,
    stdout: (r.stdout || '').toString(),
    stderr: (r.stderr || '').toString(),
  };
}

function ssh(cmd) { run('ssh', [...sshArgs, REMOTE, cmd]); }
function sshSilent(cmd) { return runSilent('ssh', [...sshArgs, REMOTE, cmd]); }
function scp(src, dst) { run('scp', [...sshArgs, src, `${REMOTE}:${dst}`]); }

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// ---- 메인 ----
console.log('');
console.log('==========================================');
console.log(`  Target: ${REMOTE}:${REMOTE_DIR}`);
console.log('==========================================');

console.log('\n==> [1/8] SSH 연결 및 Docker 확인');
console.log(`     SSH_KEY: ${SSH_KEY || '(미지정)'}`);
console.log(`     ssh args: ${JSON.stringify(sshArgs)}`);
const dockerCheck = sshSilent('docker --version && docker compose version');
if (dockerCheck.code !== 0) {
  console.error(`\nERROR: SSH 혹은 서버 상태 문제 (exit code: ${dockerCheck.code})`);
  console.error(`---- STDOUT ----\n${dockerCheck.stdout || '(비어있음)'}`);
  console.error(`---- STDERR ----\n${dockerCheck.stderr || '(비어있음)'}`);
  console.error('\n흔한 원인:');
  console.error('  - SSH_KEY 경로 오류 (Windows는 C:/... 형식)');
  console.error('  - 방화벽 / IP 변경');
  console.error('  - Docker 미설치 (sudo apt install docker.io docker-compose-v2)');
  process.exit(1);
}
console.log('     ' + dockerCheck.stdout.trim().split('\n').join('\n     '));

console.log('\n==> [2/8] 원격 디렉토리 생성');
ssh(`mkdir -p ${REMOTE_DIR}/deploy/database ${REMOTE_DIR}/deploy/qudo-api ${REMOTE_DIR}/deploy/database/data/postgres ${REMOTE_DIR}/deploy/database/data/redis ${REMOTE_DIR}/deploy/qudo-api/data/qudo-api`);

console.log('\n==> [3/8] .env 업로드');
scp('.env', `${REMOTE_DIR}/.env`);

console.log('\n==> [4/8] compose / deploy 파일 업로드');
scp('deploy/database/docker-compose.yml', `${REMOTE_DIR}/deploy/database/docker-compose.yml`);
scp('deploy/qudo-api/docker-compose.yml', `${REMOTE_DIR}/deploy/qudo-api/docker-compose.yml`);
scp('deploy/deploy.sh', `${REMOTE_DIR}/deploy/deploy.sh`);

console.log('\n==> [5/8] 데이터 디렉토리 권한');
ssh(`sudo chown -R 999:999 ${REMOTE_DIR}/deploy/database/data/postgres ${REMOTE_DIR}/deploy/database/data/redis`);
ssh(`sudo chown -R 1000:1000 ${REMOTE_DIR}/deploy/qudo-api/data/qudo-api`);
ssh(`chmod +x ${REMOTE_DIR}/deploy/deploy.sh`);

console.log('\n==> [6/8] docker network qudo-net 확인');
ssh(`docker network inspect qudo-net >/dev/null 2>&1 || docker network create qudo-net`);

console.log('\n==> [7/8] GHCR 로그인');
ssh(`echo '${GHCR_PAT}' | docker login ghcr.io -u '${GHCR_USER}' --password-stdin`);

console.log('\n==> [8/8] database 기동 → postgres healthy 대기 → qudo-api 기동');
ssh(`cd ${REMOTE_DIR} && docker compose -f deploy/database/docker-compose.yml --env-file .env up -d`);

process.stdout.write('     postgres healthy 대기');
let healthy = false;
for (let i = 0; i < 20; i++) {
  const r = sshSilent(`docker inspect --format='{{.State.Health.Status}}' qudo-postgres 2>/dev/null`);
  if (r.stdout.includes('healthy')) { healthy = true; break; }
  process.stdout.write('.');
  sleepSync(2000);
}
console.log(healthy ? ' ✓' : ' (timeout, 계속 진행)');
ssh(`cd ${REMOTE_DIR} && docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env pull`);
ssh(`cd ${REMOTE_DIR} && docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env up -d`);

console.log('');
console.log('==========================================');
console.log('  완료!');
console.log('   - 로그 확인:   npm run server:logs');
console.log('   - 이후 재배포: npm run server:deploy');
console.log('   - NPM 에서 proxy_host: qudo-api / port: 8080 로 설정');
console.log('==========================================');
