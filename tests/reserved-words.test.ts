import {describe, expect, it} from 'vitest';
import {
  checkNames,
  expressionAttributeNames,
  isReserved,
  RESERVED_WORDS,
  RESERVED_WORDS_RAW,
  reservedWordsByLetter,
  splitNames
} from '../src';

describe('RESERVED_WORDS', () => {
  it('holds the full AWS reserved list (573 words, no duplicates)', () => {
    // Pins the captured list from the AWS reference. If AWS changes the list,
    // update the raw block and this count together.
    expect(RESERVED_WORDS.size).toBe(573);
    // Also assert the RAW token count so a duplicate in the source block (which
    // the Set would silently collapse back to 573) reddens this test.
    expect(RESERVED_WORDS_RAW.trim().split(/\s+/)).toHaveLength(573);
  });

  it('is all upper-case', () => {
    for (const w of RESERVED_WORDS) {
      expect(w).toBe(w.toUpperCase());
    }
  });

  it('contains the well-known offenders and boundaries A/Z', () => {
    for (const w of ['NAME', 'STATUS', 'TIMESTAMP', 'YEAR', 'TTL', 'SIZE', 'ABORT', 'ZONE']) {
      expect(RESERVED_WORDS.has(w)).toBe(true);
    }
  });
});

describe('isReserved', () => {
  it('is case-insensitive', () => {
    expect(isReserved('name')).toBe(true);
    expect(isReserved('Name')).toBe(true);
    expect(isReserved('NAME')).toBe(true);
    expect(isReserved(' status ')).toBe(true);
  });

  it('returns false for non-reserved names', () => {
    expect(isReserved('userId')).toBe(false);
    expect(isReserved('pk')).toBe(false);
    expect(isReserved('email')).toBe(false);
  });
});

describe('splitNames', () => {
  it('splits on newlines, commas, spaces, and semicolons', () => {
    expect(splitNames('name, status\ncount; userId  pk')).toEqual([
      'name',
      'status',
      'count',
      'userId',
      'pk'
    ]);
  });

  it('drops blanks', () => {
    expect(splitNames('  \n , ; ')).toEqual([]);
  });
});

describe('checkNames', () => {
  it('flags reserved names and passes safe ones, with aliases', () => {
    const r = checkNames(['name', 'userId', 'status']);
    expect(r).toEqual([
      {name: 'name', reserved: true, alias: '#name'},
      {name: 'userId', reserved: false, alias: '#userId'},
      {name: 'status', reserved: true, alias: '#status'}
    ]);
  });

  it('de-dupes by name and skips blanks', () => {
    expect(checkNames(['name', 'name', '', '  ']).map((c) => c.name)).toEqual(['name']);
  });

  it('makes aliases unique when names collide after cleaning', () => {
    const r = checkNames(['my.attr', 'my-attr']);
    expect(r[0].alias).toBe('#my_attr');
    expect(r[1].alias).toBe('#my_attr_2');
  });

  it('falls back to #attr for a name with no word characters', () => {
    expect(checkNames(['...'])[0].alias).toBe('#attr');
  });
});

describe('expressionAttributeNames', () => {
  it('maps only the reserved names to their aliases', () => {
    const checks = checkNames(['name', 'userId', 'status']);
    expect(expressionAttributeNames(checks)).toEqual({
      '#name': 'name',
      '#status': 'status'
    });
  });

  it('is empty when nothing is reserved', () => {
    expect(expressionAttributeNames(checkNames(['pk', 'sk']))).toEqual({});
  });
});

describe('reservedWordsByLetter — the published reference', () => {
  it('groups every reserved word exactly once', () => {
    const groups = reservedWordsByLetter();
    const flat = groups.flatMap((g) => g.words);
    expect(flat).toHaveLength(RESERVED_WORDS.size);
    expect(new Set(flat).size).toBe(RESERVED_WORDS.size);
    for (const w of flat) expect(RESERVED_WORDS.has(w)).toBe(true);
  });

  it('sorts groups by letter and words within a group', () => {
    const groups = reservedWordsByLetter();
    expect(groups.map((g) => g.letter)).toEqual([...groups.map((g) => g.letter)].sort());
    for (const g of groups) {
      expect(g.words).toEqual([...g.words].sort());
      for (const w of g.words) expect(w.startsWith(g.letter)).toBe(true);
    }
  });

  it('has no empty group', () => {
    for (const g of reservedWordsByLetter()) expect(g.words.length).toBeGreaterThan(0);
  });
});
