import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTopics } from '../useTopics';
import { topicService } from '../../../../../services/topicService';

vi.mock('../../../../../services/topicService', () => ({
  topicService: {
    fetchAllTopics: vi.fn(),
    createTopic: vi.fn(),
    updateTopic: vi.fn(),
    toggleTopicActive: vi.fn(),
    deleteTopic: vi.fn(),
    deleteTopics: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    insertParsedQuestions: vi.fn(),
  },
}));

vi.mock('../../../../../contexts/TeacherContext', () => ({
  useTeacher: () => ({ teacherId: 'teacher-123' }),
}));

describe('useTopics hook', () => {
  const mockTopics = [
    {
      id: 'topic-1',
      title: 'Topic 1',
      type: 'standard',
      is_active: true,
      order_index: 1,
      grades: [1],
      questions: [{ id: 'q1', text: 'Question 1', order_index: 1 }],
    },
    {
      id: 'topic-2',
      title: 'Topic 2',
      type: 'standard',
      is_active: true,
      order_index: 2,
      grades: [2],
      questions: [{ id: 'q2', text: 'Question 2', order_index: 1 }],
    },
    {
      id: 'topic-3',
      title: 'Topic 3 (BongBe)',
      type: 'bongbe',
      is_active: true,
      order_index: 1,
      grades: [],
      questions: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (topicService.fetchAllTopics as any).mockResolvedValue(mockTopics);
  });

  it('fetches topics on mount', async () => {
    const { result } = renderHook(() => useTopics());
    await act(async () => {});

    expect(topicService.fetchAllTopics).toHaveBeenCalledWith('teacher-123');
    expect(result.current.topics).toEqual(mockTopics);
    expect(result.current.loading).toBe(false);
  });

  it('handles topic selection and toggle correctly', async () => {
    const { result } = renderHook(() => useTopics());
    await act(async () => {});

    expect(result.current.selectedTopicIds).toEqual([]);
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isSomeSelected).toBe(false);

    // Select topic-1
    act(() => {
      result.current.toggleSelectTopic('topic-1');
    });
    expect(result.current.selectedTopicIds).toEqual(['topic-1']);
    expect(result.current.isSomeSelected).toBe(true);
    expect(result.current.isAllSelected).toBe(false);

    // Select topic-2 (all standard topics selected)
    act(() => {
      result.current.toggleSelectTopic('topic-2');
    });
    expect(result.current.selectedTopicIds).toEqual(['topic-1', 'topic-2']);
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.isSomeSelected).toBe(false);

    // Toggle topic-1 off
    act(() => {
      result.current.toggleSelectTopic('topic-1');
    });
    expect(result.current.selectedTopicIds).toEqual(['topic-2']);
  });

  it('selects all and deselects all topics', async () => {
    const { result } = renderHook(() => useTopics());
    await act(async () => {});

    // Select all standard topics
    act(() => {
      result.current.selectAllTopics();
    });
    expect(result.current.selectedTopicIds).toEqual(['topic-1', 'topic-2']);
    expect(result.current.isAllSelected).toBe(true);

    // Toggle select all when already all selected -> deselect all
    act(() => {
      result.current.toggleSelectAll();
    });
    expect(result.current.selectedTopicIds).toEqual([]);
    expect(result.current.isAllSelected).toBe(false);

    // Toggle select all when none selected -> select all
    act(() => {
      result.current.toggleSelectAll();
    });
    expect(result.current.selectedTopicIds).toEqual(['topic-1', 'topic-2']);
    expect(result.current.isAllSelected).toBe(true);

    // Deselect all
    act(() => {
      result.current.deselectAllTopics();
    });
    expect(result.current.selectedTopicIds).toEqual([]);
  });

  it('clears selection when switching activeType tab', async () => {
    const { result } = renderHook(() => useTopics());
    await act(async () => {});

    act(() => {
      result.current.toggleSelectTopic('topic-1');
    });
    expect(result.current.selectedTopicIds).toEqual(['topic-1']);

    act(() => {
      result.current.setActiveType('bongbe');
    });
    expect(result.current.selectedTopicIds).toEqual([]);
  });

  it('opens bulk delete modal and executes bulk delete successfully', async () => {
    (topicService.deleteTopics as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTopics());
    await act(async () => {});

    act(() => {
      result.current.toggleSelectTopic('topic-1');
      result.current.toggleSelectTopic('topic-2');
    });

    act(() => {
      result.current.openBulkDeleteModal();
    });

    expect(result.current.deleteTarget).toEqual({
      type: 'bulk-topics',
      ids: ['topic-1', 'topic-2'],
      label: '2 chủ đề',
      count: 2,
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(topicService.deleteTopics).toHaveBeenCalledWith(['topic-1', 'topic-2']);
    expect(result.current.selectedTopicIds).toEqual([]);
    expect(result.current.deleteTarget).toBeNull();
  });

  it('handles error in bulk delete gracefully', async () => {
    (topicService.deleteTopics as any).mockRejectedValue(new Error('Failed to bulk delete'));

    const { result } = renderHook(() => useTopics());
    await act(async () => {});

    act(() => {
      result.current.toggleSelectTopic('topic-1');
    });

    act(() => {
      result.current.openBulkDeleteModal();
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(result.current.deleteError).toBe('Failed to bulk delete');
    expect(result.current.deleteSaving).toBe(false);
  });
});
