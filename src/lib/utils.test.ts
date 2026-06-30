import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts', () => {
    const merged = cn('px-2', 'px-4', 'text-sm', false && 'hidden', undefined);

    expect(merged).toBe('px-4 text-sm');
  });

  it('supports conditional and object syntax from clsx', () => {
    const merged = cn('base', { active: true, disabled: false }, ['inline', null]);

    expect(merged).toBe('base active inline');
  });
});
