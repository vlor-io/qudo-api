#!/usr/bin/env node
/**
 * 로컬 개발 실행: SSH 터널 + NestJS start:dev
 * 사용: npm run dev
 *
 * 동작:
 *   1) 오라클 서버로 SSH 터널 연결 (로컬 5433→서버 postgres, 6380→서버 redis)
 *   2) NestJS dev 서버 실행
 *   3) Ctrl+C 시 터널도 같이 종료
 */
'use strict';

const fs = require('fs');
const { spawn } = require('child_process');

if (!fs.existsSync('.deploy.env')) {
  console.error('ERROR: .deploy.env 가 없습니다. SSH 접속 정보가 필요합니다.');
  process.exit(1);
}
require('dotenv').config({ path: '.deploy.env' });

const { SSH_HOST, SSH_USER, SSH_KEY } = process.env;
if (!SSH_HOST || !SSH_USER) {
  console.error('ERROR: SSH_HOST / SSH_USER 가 .deploy.env 에 없습니다.');
  process.exit(1);
}
const HOME = process.env.HOME || process.env.USERPROFILE || '';

const sshArgs = [
  '-N',  // remote command 실행 안 함 (터널만)
  '-L', '5433:localhost:5433',
  '-L', '6380:localhost:6380',
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', 'ServerAliveInterval=30',
  '-o', 'ExitOnForwardFailure=yes',
];
if (SSH_KEY) sshArgs.push('-i', SSH_KEY.replace(/^~/, HOME));
sshArgs.push(`${SSH_USER}@${SSH_HOST}`);

console.log('==> SSH 터널 연결 시도');
console.log(`    ${SSH_USER}@${SSH_HOST}  (127.0.0.1:5433 → postgres, 127.0.0.1:6380 → redis)`);

const tunnel = spawn('ssh', sshArgs, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });

tunnel.stderr.on('data', (d) => {
  const s = d.toString();
  // ssh의 informational 메시지는 stderr로 나옴
  process.stderr.write(`[ssh] ${s}`);
});

let nestProc = null;

// 터널 프로세스가 죽으면 전체 종료
tunnel.on('exit', (code) => {
  if (!nestProc) {
    console.error(`\n==> SSH 터널 연결 실패 (exit code: ${code})`);
    process.exit(code || 1);
  } else {
    console.log('\n==> SSH 터널 종료됨. NestJS 도 종료.');
    nestProc.kill();
    process.exit(0);
  }
});

// 터널 성립 대기 (2초 정도면 충분)
setTimeout(() => {
  console.log('\n==> NestJS dev 서버 시작 (start:dev)');
  nestProc = spawn('npm', ['run', 'start:dev'], {
    stdio: 'inherit',
    shell: true,  // Windows에서 npm 찾으려면 shell:true
  });

  nestProc.on('exit', (code) => {
    console.log(`\n==> NestJS 종료 (code: ${code}). SSH 터널도 종료.`);
    tunnel.kill();
    process.exit(code || 0);
  });
}, 2000);

// Ctrl+C 핸들링
process.on('SIGINT', () => {
  console.log('\n==> 중단 요청 (Ctrl+C). 정리중...');
  if (nestProc) nestProc.kill();
  tunnel.kill();
  setTimeout(() => process.exit(0), 500);
});
