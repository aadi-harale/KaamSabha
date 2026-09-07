import { describe, expect, it } from 'vitest';
import {
  authenticateUser,
  canAccessRolePath,
  internalAuthEmail,
  roleLanding,
} from '../lib/application/auth';
import {
  LocalApplicationRepository,
  type StoragePort,
} from '../lib/application/repositories';
import {
  addIssueResponse,
  raiseIssue,
  signInApplication,
  signOutApplication,
  updateIssueStatus,
} from '../lib/application/service';

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('role authentication and access', () => {
  it('maps User IDs to private internal auth emails', () => {
    expect(internalAuthEmail(' Meena01 ')).toBe('meena01@auth.kaamsabha.local');
  });

  it('authenticates deterministic customer, worker and admin accounts', async () => {
    await expect(authenticateUser('customer01', 'Customer@26089', 'customer')).resolves.toMatchObject({ role: 'customer', mode: 'offline' });
    await expect(authenticateUser('meena01', 'Member@26089', 'worker')).resolves.toMatchObject({ role: 'worker', memberId: 'W01' });
    await expect(authenticateUser('admin01', 'Admin@26089', 'admin')).resolves.toMatchObject({ role: 'admin' });
  });

  it('rejects incorrect passwords, unknown users and role mismatch', async () => {
    await expect(authenticateUser('customer01', 'wrong', 'customer')).rejects.toThrow('incorrect');
    await expect(authenticateUser('unknown01', 'Customer@26089', 'customer')).rejects.toThrow('incorrect');
    await expect(authenticateUser('meena01', 'Member@26089', 'customer')).rejects.toThrow('incorrect');
  });

  it('keeps each role inside its own route group', () => {
    expect(roleLanding('admin')).toBe('/operations');
    expect(canAccessRolePath('customer', '/customer/past')).toBe(true);
    expect(canAccessRolePath('customer', '/worker')).toBe(false);
    expect(canAccessRolePath('worker', '/governance')).toBe(false);
    expect(canAccessRolePath('admin', '/governance')).toBe(true);
    expect(canAccessRolePath('admin', '/customer')).toBe(false);
  });

  it('persists and clears an authenticated local session', async () => {
    const storage = new MemoryStorage();
    const repo = new LocalApplicationRepository(storage);
    await signInApplication(repo, { userId: 'meena01', password: 'Member@26089', role: 'worker' });
    expect(repo.read().session.auth).toMatchObject({ userId: 'meena01', role: 'worker' });
    expect(new LocalApplicationRepository(storage).read().session.memberId).toBe('W01');
    await signOutApplication(repo);
    expect(repo.read().session.auth).toBeNull();
  });
});

describe('persisted issue workflow', () => {
  it('raises, responds to and resolves an issue without a penalty', async () => {
    const storage = new MemoryStorage();
    const repo = new LocalApplicationRepository(storage);
    await raiseIssue(repo, {
      actor: { role: 'worker', id: 'W01' },
      issueType: 'policy-suggestion',
      description: 'Discuss a smaller maximum extra travel delay.',
    });
    const issue = repo.read().issues[0];
    expect(issue.category).toBe('policy');
    expect(repo.read().ledger).toHaveLength(0);
    await addIssueResponse(repo, issue.id, { role: 'operations', id: 'admin01' }, 'Added to the next member agenda.');
    expect(repo.read().issues[0].status).toBe('under-review');
    await updateIssueStatus(repo, issue.id, 'resolved');
    expect(repo.read().issues[0]).toMatchObject({ status: 'resolved' });
    expect(new LocalApplicationRepository(storage).read().issues[0].comments).toHaveLength(1);
  });
});
