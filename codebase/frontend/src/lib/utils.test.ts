import { cn } from './utils';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('should resolve tailwind conflicting classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('should handle conditional classes', () => {
    const hasError = true;
    const isHidden = false;
    expect(cn('base', hasError && 'border-red-500', isHidden && 'hidden')).toBe(
      'base border-red-500',
    );
  });
});

