import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
  ['test', ['run', 'test']],
  ['build', ['run', 'build']],
];

for (const [name, args] of steps) {
  console.log(`\n[OMIND quality] ${name}`);
  const result = spawnSync(npm, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`\n[OMIND quality] FAILED: ${name}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[OMIND quality] PASS');
