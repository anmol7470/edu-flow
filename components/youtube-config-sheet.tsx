'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/convex/_generated/api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

const youtubeUrlSchema = z
  .url({ message: 'Must be a valid URL' })
  .refine((url) => url.includes('youtube.com') || url.includes('youtu.be'), {
    message: 'Must be a YouTube URL',
  })

const formSchema = z.object({
  url1: youtubeUrlSchema,
  url2: z.string().refine(
    (url) => {
      // Allow empty strings
      if (!url || url.trim() === '') return true
      // If not empty, must be a valid URL
      try {
        new URL(url)
        return url.includes('youtube.com') || url.includes('youtu.be')
      } catch {
        return false
      }
    },
    { message: 'Must be a valid YouTube URL or leave empty' }
  ),
})

type FormValues = z.infer<typeof formSchema>

type YouTubeConfigSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  nodeId: string
  initialConfig?: { urls: string[] }
}

export function YouTubeConfigSheet({ open, onOpenChange, workflowId, nodeId, initialConfig }: YouTubeConfigSheetProps) {
  const saveNodeConfig = useMutation(api.nodeExecutions.saveNodeConfig)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url1: initialConfig?.urls?.[0] || '',
      url2: initialConfig?.urls?.[1] || '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      // Filter out empty URLs
      const urls = [values.url1, values.url2].filter((url) => url && url.trim() !== '')

      const config = {
        urls,
      }

      await saveNodeConfig({
        workflowId,
        nodeId,
        config: JSON.stringify(config),
      })

      toast.success('Configuration saved!')
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configure YouTube Analyzer</SheetTitle>
          <SheetDescription>Add 1-2 YouTube video URLs to analyze and summarize</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
            <FormField
              control={form.control}
              name="url1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URL 1 (Required)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URL 2 (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
