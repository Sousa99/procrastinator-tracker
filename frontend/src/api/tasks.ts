import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type CreateTaskInput,
  type TaskFilters,
  type TaskStatus,
  type UpdateTaskInput,
} from './client';

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.listTasks(filters),
    placeholderData: keepPreviousData,
  });
}

export function useTask(id: number | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.getTask(id!),
    enabled: id !== undefined,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.createTask(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) => api.setStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: ['task'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) =>
      api.updateTask(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: ['task'] });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => api.addComment(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['task'] });
    },
  });
}
