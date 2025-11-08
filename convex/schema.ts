import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workflows: defineTable({
    workflowId: v.string(),
    userId: v.string(),
    nodes: v.string(), // JSON stringified nodes array
    edges: v.string(), // JSON stringified edges array
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_workflow_id", ["workflowId"])
    .index("by_user", ["userId"]),
});
