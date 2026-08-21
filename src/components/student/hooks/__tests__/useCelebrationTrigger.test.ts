import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCelebrationTrigger } from '../useCelebrationTrigger';

describe('useCelebrationTrigger hook', () => {
  it('does not trigger celebration on initial mount even if topics are completed', () => {
    const { result } = renderHook(() => useCelebrationTrigger([1, 2], false, 5));
    expect(result.current.showCelebration).toBe(false);
  });

  it('does not trigger celebration when data is loading', () => {
    const { result, rerender } = renderHook(
      ({ completed, loading }) => useCelebrationTrigger(completed, loading, 5),
      { initialProps: { completed: [] as number[], loading: true } }
    );
    expect(result.current.showCelebration).toBe(false);

    // Recordings load and completed numbers become [1, 2], but loading transitions to false
    rerender({ completed: [1, 2], loading: false });
    expect(result.current.showCelebration).toBe(false);
  });

  it('triggers celebration when a new topic is completed', () => {
    let completedTopics = [1, 2];
    const { result, rerender } = renderHook(
      ({ completed }) => useCelebrationTrigger(completed, false, 5),
      { initialProps: { completed: completedTopics } }
    );

    expect(result.current.showCelebration).toBe(false);

    // Simulate finishing topic 3
    completedTopics = [1, 2, 3];
    rerender({ completed: completedTopics });

    expect(result.current.showCelebration).toBe(true);

    // Close celebration modal
    act(() => {
      result.current.closeCelebration();
    });

    expect(result.current.showCelebration).toBe(false);
  });
});
