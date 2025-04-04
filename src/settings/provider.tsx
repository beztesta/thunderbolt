import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { settingsTable } from '@/db/tables'
import { eq } from 'drizzle-orm'
import { useDrizzle } from '@/db/provider'

export function useSetting<T = string>(
  key: string
): {
  value: T | null
  isLoading: boolean
  setValue: (value: T) => Promise<void>
} {
  const { db } = useDrizzle()
  const queryClient = useQueryClient()

  const { data: value, isLoading } = useQuery<T | null>({
    queryKey: ['settings', key],
    queryFn: async () => {
      const setting = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).get()
      if (!setting) return null
      return setting.value as T
    },
  })

  const mutation = useMutation({
    mutationFn: async (updatedValue: T) => {
      await db
        .update(settingsTable)
        .set({ value: updatedValue as unknown as string })
        .where(eq(settingsTable.key, key))
    },
    onMutate: async (updatedValue) => {
      await queryClient.cancelQueries({ queryKey: ['settings', key] })
      const previousValue = queryClient.getQueryData(['settings', key])
      queryClient.setQueryData(['settings', key], updatedValue)
      return { previousValue }
    },
  })

  const setValue = async (value: T) => {
    await mutation.mutateAsync(value)
  }

  console.log('key', key, value)

  return {
    value: value as T | null,
    isLoading,
    setValue,
  }
}
