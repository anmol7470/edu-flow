import { v } from 'convex/values'
import { mutation } from './_generated/server'

/**
 * Generate a URL for uploading a file to Convex storage
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Get metadata for an uploaded file
 */
export const getFileUrl = mutation({
  args: {
    storageId: v.id('_storage'),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

/**
 * Delete files from storage
 */
export const deleteFiles = mutation({
  args: {
    storageIds: v.array(v.id('_storage')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const storageId of args.storageIds) {
      await ctx.storage.delete(storageId)
    }
    return null
  },
})

