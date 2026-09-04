import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.listTags(),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.listUsers(),
  });
}
