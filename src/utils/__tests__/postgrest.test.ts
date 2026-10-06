import { describe, it, expect, vi } from 'vitest';
import { escapeLikePattern, fetchAllRows, isMissingColumnError } from '../postgrest';

describe('escapeLikePattern', () => {
  it('leaves plain names untouched', () => {
    expect(escapeLikePattern('Nguyễn Văn An')).toBe('Nguyễn Văn An');
  });

  it('escapes LIKE wildcards and backslashes', () => {
    expect(escapeLikePattern('An_1%')).toBe('An\\_1\\%');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('downgrades the PostgREST * wildcard to a single-character match', () => {
    expect(escapeLikePattern('An*')).toBe('An_');
  });
});

describe('isMissingColumnError', () => {
  it('detects a missing column in filters and inserts', () => {
    expect(
      isMissingColumnError(
        { code: '42703', message: 'column recordings.student_id does not exist' },
        'student_id'
      )
    ).toBe(true);
    expect(
      isMissingColumnError(
        {
          code: 'PGRST204',
          message: "Could not find the 'student_id' column of 'recordings' in the schema cache",
        },
        'student_id'
      )
    ).toBe(true);
  });

  it('ignores other errors and other columns', () => {
    expect(isMissingColumnError(null, 'student_id')).toBe(false);
    expect(
      isMissingColumnError({ code: '42703', message: 'column grade does not exist' }, 'student_id')
    ).toBe(false);
    expect(
      isMissingColumnError(
        { code: '23503', message: 'violates foreign key constraint "recordings_student_id_fkey"' },
        'student_id'
      )
    ).toBe(false);
  });
});

describe('fetchAllRows', () => {
  it('requests consecutive ranges until a short page is returned', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => i);
    const buildPage = vi.fn((from: number, to: number) =>
      Promise.resolve({ data: rows.slice(from, to + 1), error: null })
    );

    const result = await fetchAllRows(buildPage, 10);

    expect(result).toEqual(rows);
    expect(buildPage.mock.calls).toEqual([
      [0, 9],
      [10, 19],
      [20, 29],
    ]);
  });

  it('makes a single request when everything fits in one page', async () => {
    const buildPage = vi.fn(() => Promise.resolve({ data: [1, 2], error: null }));

    expect(await fetchAllRows(buildPage)).toEqual([1, 2]);
    expect(buildPage).toHaveBeenCalledTimes(1);
    expect(buildPage).toHaveBeenCalledWith(0, 999);
  });

  it('throws the first page error', async () => {
    const error = new Error('boom');
    await expect(fetchAllRows(() => Promise.resolve({ data: null, error }))).rejects.toBe(error);
  });
});
