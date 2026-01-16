import { db } from "~/db";
import {
  conversations,
  messages,
  type Conversation,
  type Message,
} from "~/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export type NewConversation = {
  title?: string | null;
};

export type ConversationWithMessages = Conversation & {
  messages: Message[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export interface IConversationRepository {
  findAll(userId: string): Promise<Conversation[]>;
  findById(userId: string, id: string): Promise<Conversation | null>;
  findByIdWithMessages(userId: string, id: string): Promise<ConversationWithMessages | null>;
  create(userId: string, data?: NewConversation): Promise<Conversation>;
  updateTitle(userId: string, id: string, title: string): Promise<Conversation | null>;
  delete(userId: string, id: string): Promise<void>;
  addMessage(conversationId: string, role: "user" | "assistant", content: string): Promise<Message>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
}

export const conversationRepository: IConversationRepository = {
  async findAll(userId) {
    return db.query.conversations.findMany({
      where: eq(conversations.userId, userId),
      orderBy: [desc(conversations.updatedAt)],
    });
  },

  async findById(userId, id) {
    return db.query.conversations.findFirst({
      where: and(eq(conversations.id, id), eq(conversations.userId, userId)),
    }) ?? null;
  },

  async findByIdWithMessages(userId, id) {
    const conversation = await db.query.conversations.findFirst({
      where: and(eq(conversations.id, id), eq(conversations.userId, userId)),
    });

    if (!conversation) return null;

    const msgs = await db.query.messages.findMany({
      where: eq(messages.conversationId, id),
      orderBy: [asc(messages.createdAt)],
    });

    return { ...conversation, messages: msgs };
  },

  async create(userId, data = {}) {
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
        title: data.title || null,
      })
      .returning();
    return conversation;
  },

  async updateTitle(userId, id, title) {
    const [updated] = await db
      .update(conversations)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async delete(userId, id) {
    await db.delete(conversations).where(
      and(eq(conversations.id, id), eq(conversations.userId, userId))
    );
  },

  async addMessage(conversationId, role, content) {
    // Update conversation's updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        role,
        content,
      })
      .returning();
    return message;
  },

  async getMessages(conversationId) {
    const msgs = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [asc(messages.createdAt)],
    });

    return msgs.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  },
};
