import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../../api/client';

export function useActors() {
  return useQuery({
    queryKey: ['actors'],
    queryFn: ({ signal }) => taskApi.actors(signal),
    staleTime: Infinity,
  });
}

export function useTasks(deleted: boolean) {
  return useQuery({
    queryKey: ['tasks', deleted],
    queryFn: ({ signal }) => taskApi.list(deleted, signal),
  });
}

export function useTaskActions() {
  const client = useQueryClient();
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['tasks'] }),
      client.invalidateQueries({ queryKey: ['history'] }),
    ]);
  }
  return {
    create: useMutation({ mutationFn: taskApi.create, onSuccess: refresh }),
    changeStatus: useMutation({ mutationFn: taskApi.changeStatus, onSettled: refresh }),
    remove: useMutation({ mutationFn: taskApi.delete, onSettled: refresh }),
  };
}
