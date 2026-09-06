import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskStackWrapper } from '../src/components/task/TaskStackWrapper';
import { sampleTasks } from '../src/components/task/TaskStack.fixtures';
import type { Task } from '../src/api/client';

describe('TaskStackWrapper', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches tasks on mount and renders them', async () => {
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskStackWrapper dataSource={dataSource} refreshRateMs={0} />);
    expect(await screen.findByText('Set up project structure')).toBeInTheDocument();
    expect(dataSource).toHaveBeenCalledTimes(1);
  });

  it('passes filters to the data source', async () => {
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(
      <TaskStackWrapper
        filters={{ status: 'in-progress' }}
        dataSource={dataSource}
        refreshRateMs={0}
      />,
    );
    await screen.findByText('Implement MCP tools');
    expect(dataSource).toHaveBeenCalledWith({ status: 'in-progress' });
  });

  it('shows an empty state when no tasks match', async () => {
    const dataSource = vi.fn().mockResolvedValue([]);
    render(<TaskStackWrapper dataSource={dataSource} refreshRateMs={0} />);
    expect(await screen.findByText(/No tasks yet/i)).toBeInTheDocument();
  });

  it('shows an error state when the data source rejects', async () => {
    const dataSource = vi.fn().mockRejectedValue(new Error('boom'));
    render(<TaskStackWrapper dataSource={dataSource} refreshRateMs={0} />);
    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
  });

  it('refetches on the refresh interval', async () => {
    vi.useFakeTimers();
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskStackWrapper dataSource={dataSource} refreshRateMs={1000} />);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(dataSource).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(dataSource).toHaveBeenCalledTimes(2);
  });

  it('never overlaps an in-flight request', async () => {
    vi.useFakeTimers();
    let resolveFirst!: (tasks: Task[]) => void;
    const dataSource = vi
      .fn()
      .mockImplementation(() => new Promise<Task[]>((resolve) => (resolveFirst = resolve)));
    render(<TaskStackWrapper dataSource={dataSource} refreshRateMs={1000} />);
    await vi.advanceTimersByTimeAsync(0);
    expect(dataSource).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(dataSource).toHaveBeenCalledTimes(1);
    resolveFirst(sampleTasks);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(dataSource).toHaveBeenCalledTimes(2);
  });

  it('clears the interval on unmount', async () => {
    vi.useFakeTimers();
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    const { unmount } = render(<TaskStackWrapper dataSource={dataSource} refreshRateMs={1000} />);
    await vi.advanceTimersByTimeAsync(0);
    expect(dataSource).toHaveBeenCalledTimes(1);
    unmount();
    await vi.advanceTimersByTimeAsync(3000);
    expect(dataSource).toHaveBeenCalledTimes(1);
  });

  it('fetches once when refreshRateMs is 0', async () => {
    vi.useFakeTimers();
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    render(<TaskStackWrapper dataSource={dataSource} refreshRateMs={0} />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(dataSource).toHaveBeenCalledTimes(1);
  });

  it('recreates the interval when refreshRateMs changes', async () => {
    vi.useFakeTimers();
    const dataSource = vi.fn().mockResolvedValue(sampleTasks);
    const { rerender } = render(<TaskStackWrapper dataSource={dataSource} refreshRateMs={5000} />);
    await vi.advanceTimersByTimeAsync(0);
    rerender(<TaskStackWrapper dataSource={dataSource} refreshRateMs={1000} />);
    await vi.advanceTimersByTimeAsync(1000);
    expect(dataSource).toHaveBeenCalledTimes(2);
  });
});
