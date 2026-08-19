import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryPlayer } from '../useStoryPlayer';

describe('useStoryPlayer', () => {
  beforeEach(() => {
    (window as any).speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
    };
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      onend: any = null;
      onerror: any = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    (window as any).SpeechSynthesisUtterance = MockUtterance;
  });

  it('initializes with null selectedStory and not playing audio', () => {
    const { result } = renderHook(() => useStoryPlayer());
    expect(result.current.selectedStory).toBeNull();
    expect(result.current.isPlayingStoryAudio).toBe(false);
  });

  it('plays story audio when playStoryAudio is called with selected story', () => {
    const { result } = renderHook(() => useStoryPlayer());
    const mockStory = { title: 'The Ant', content: 'Once upon a time...' };

    act(() => {
      result.current.setSelectedStory(mockStory);
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any;

    act(() => {
      result.current.playStoryAudio(mockEvent);
    });

    expect(result.current.isPlayingStoryAudio).toBe(true);
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('stops audio if currently playing when playStoryAudio is clicked again', () => {
    const { result } = renderHook(() => useStoryPlayer());
    const mockStory = { title: 'The Ant', content: 'Once upon a time...' };

    act(() => {
      result.current.setSelectedStory(mockStory);
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any;

    // Start playing
    act(() => {
      result.current.playStoryAudio(mockEvent);
    });
    expect(result.current.isPlayingStoryAudio).toBe(true);

    // Click again to toggle off
    act(() => {
      result.current.playStoryAudio(mockEvent);
    });
    expect(result.current.isPlayingStoryAudio).toBe(false);
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('cleans up and closes modal properly in closeStoryModal', () => {
    const { result } = renderHook(() => useStoryPlayer());

    act(() => {
      result.current.setSelectedStory({ title: 'Test', content: 'Content' });
    });

    act(() => {
      result.current.closeStoryModal();
    });

    expect(result.current.selectedStory).toBeNull();
    expect(result.current.isPlayingStoryAudio).toBe(false);
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});
