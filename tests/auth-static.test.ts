import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('daily login is one password form and no employer OTP login route remains', () => {
  const loginPage = read('src/app/login/page.tsx');
  const loginForm = read('src/app/login/LoginForm.tsx');
  assert.equal(existsSync(join(root, 'src/app/login/EmployerOtpLoginForm.tsx')), false);
  assert.equal(existsSync(join(root, 'src/app/api/auth/employer-login/route.ts')), false);
  assert.match(loginForm, /identifier/);
  assert.match(loginForm, /password/);
  assert.doesNotMatch(loginPage, /EmployerOtpLoginForm/);
  assert.doesNotMatch(loginForm, /otpCode|Send WhatsApp OTP|EMPLOYER_LOGIN/);
});

test('public OTP endpoints only allow registration purposes', () => {
  const sendRoute = read('src/app/api/public/otp/send/route.ts');
  const verifyRoute = read('src/app/api/public/otp/verify/route.ts');
  assert.match(sendRoute, /PART_TIMER_REGISTER/);
  assert.match(sendRoute, /EMPLOYER_REGISTER/);
  assert.doesNotMatch(sendRoute, /EMPLOYER_LOGIN|PART_TIMER_LOGIN|STAFF_LOGIN/);
  assert.doesNotMatch(verifyRoute, /EMPLOYER_LOGIN|PART_TIMER_LOGIN|STAFF_LOGIN/);
});

test('registration creates canonical account records and compatibility links', () => {
  const employerRoute = read('src/app/api/public/register/employer/route.ts');
  const workerRoute = read('src/app/api/public/register/part-timer/route.ts');
  assert.match(employerRoute, /userAccount\.create/);
  assert.match(employerRoute, /userIdentity|identities/);
  assert.match(employerRoute, /credential/);
  assert.match(employerRoute, /tenantMembership\.create/);
  assert.match(employerRoute, /submittedByUserId/);
  assert.match(employerRoute, /employerDashboardPath\(\)\}\?registered=1/);
  assert.match(workerRoute, /userAccount\.create/);
  assert.match(workerRoute, /credential/);
  assert.match(workerRoute, /userId: user\.id/);
  assert.match(workerRoute, /\/worker\/dashboard\?registered=1/);
});

test('review artifacts exist for audit and phased migrations', () => {
  assert.equal(existsSync(join(root, 'docs/auth/user-management-redesign.md')), true);
  assert.equal(existsSync(join(root, 'postgresql/audits/auth_identity_audit.sql')), true);
  assert.equal(existsSync(join(root, 'prisma/migrations/20260525010000_auth_user_model_phase1/migration.sql')), true);
  assert.equal(existsSync(join(root, 'prisma/migrations/20260525011000_auth_user_model_phase2_backfill/migration.sql')), true);
  assert.equal(existsSync(join(root, 'prisma/migrations/20260525012000_auth_user_model_phase3_cutover/migration.sql')), true);
});
