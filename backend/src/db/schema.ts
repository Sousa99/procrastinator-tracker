import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const TASK_STATUSES = [
  'to-start',
  'started',
  'in-progress',
  'on-hold',
  'validating',
  'finished',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const tasks = sqliteTable(
  'tasks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('to-start'),
    location: text('location'),
    urgency: integer('urgency'),
    parentTaskId: integer('parent_task_id'),
    dueDate: integer('due_date', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('tasks_status_idx').on(t.status),
    index('tasks_parent_task_id_idx').on(t.parentTaskId),
    index('tasks_due_date_idx').on(t.dueDate),
  ],
);

export const recurrenceRules = sqliteTable(
  'recurrence_rules',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    taskId: integer('task_id')
      .notNull()
      .unique()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    frequency: text('frequency', { enum: RECURRENCE_FREQUENCIES }).notNull(),
    interval: integer('interval').notNull().default(1),
    anchorDate: integer('anchor_date', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('recurrence_rules_task_id_idx').on(t.taskId)],
);

export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    status: text('status', { enum: TASK_STATUSES }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('comments_task_id_idx').on(t.taskId)],
);

export const taskAssignees = sqliteTable(
  'task_assignees',
  {
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.userId] })],
);

export const taskTags = sqliteTable(
  'task_tags',
  {
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
);

export const tasksRelations = relations(tasks, ({ many, one }) => ({
  assignees: many(taskAssignees),
  tags: many(taskTags),
  comments: many(comments),
  parent: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id] }),
  recurrenceRule: one(recurrenceRules, {
    fields: [tasks.id],
    references: [recurrenceRules.taskId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(taskAssignees),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  tasks: many(taskTags),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, { fields: [taskAssignees.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskAssignees.userId], references: [users.id] }),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
}));

export const recurrenceRulesRelations = relations(recurrenceRules, ({ one }) => ({
  task: one(tasks, { fields: [recurrenceRules.taskId], references: [tasks.id] }),
}));

export type User = typeof users.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskStatusValue = TaskStatus;
export type Comment = typeof comments.$inferSelect;
export type RecurrenceRule = typeof recurrenceRules.$inferSelect;
