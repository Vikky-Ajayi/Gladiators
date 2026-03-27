import { useMutation, useQuery } from '@tanstack/react-query';
import { createScan, getScan } from '../api/scans';

export function useScan() {
  const createMutation = useMutation({
    mutationFn: createScan,
  });

  const useScanResult = (id: string) => useQuery({
    queryKey: ['scan', id],
    queryFn: () => getScan(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      return data?.state?.status === 'processing' ? 2000 : false;
    },
  });

  return { createMutation, useScanResult };
}
