import { describe, it, expect } from 'vitest';
import { homePathFor } from '../routes';

describe('homePathFor', () => {
  it('sends signed-out visitors to the login page', () => {
    expect(homePathFor(null)).toBe('/login');
    expect(homePathFor(undefined)).toBe('/login');
  });

  it('maps each role to its home page', () => {
    expect(homePathFor({ role: 'super_admin' })).toBe('/admin/dashboard');
    expect(homePathFor({ role: 'teacher' })).toBe('/teacher/attendance');
    expect(homePathFor({ role: 'student' })).toBe('/student');
  });
});
