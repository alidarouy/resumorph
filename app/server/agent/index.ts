import { createServerFn } from "@tanstack/react-start";
import { runAgent, type Message } from "./agent";
import { streamAgent } from "./stream";
import { conversationRepository } from "../repositories";
import type { Conversation } from "~/db/schema";

export type { Message };

type ChatInput = {
  userId: string;
  message: string;
  conversationId?: string;
};

type ChatResponse = {
  response: string;
  conversationId: string;
};

export const chat = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: ChatInput }): Promise<ChatResponse> => {
    const { userId, message, conversationId } = ctx.data;

    if (!userId) {
      throw new Error("Non authentifié");
    }

    try {
      let convId = conversationId;

      // Create new conversation if needed
      if (!convId) {
        const conversation = await conversationRepository.create(userId, {
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        });
        convId = conversation.id;
      }

      // Get existing messages
      const existingMessages = await conversationRepository.getMessages(convId);

      // Add user message
      await conversationRepository.addMessage(convId, "user", message);

      // Run agent with all messages
      const allMessages: Message[] = [...existingMessages, { role: "user", content: message }];
      const response = await runAgent(userId, allMessages);

      // Save assistant response
      await conversationRepository.addMessage(convId, "assistant", response);

      return { response, conversationId: convId };
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
    }
  }
);

// Get all conversations for a user
export const getConversations = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string } }): Promise<Conversation[]> => {
    const { userId } = ctx.data;
    if (!userId) return [];
    return conversationRepository.findAll(userId);
  }
);

// Get a conversation with its messages
export const getConversation = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; conversationId: string } }) => {
    const { userId, conversationId } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    return conversationRepository.findByIdWithMessages(userId, conversationId);
  }
);

// Delete a conversation
export const deleteConversation = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; conversationId: string } }) => {
    const { userId, conversationId } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    await conversationRepository.delete(userId, conversationId);
    return { success: true };
  }
);

// Streaming chat function
export const chatStream = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: ChatInput }): Promise<Response> => {
    const { userId, message, conversationId } = ctx.data;

    if (!userId) {
      return new Response("Non authentifié", { status: 401 });
    }

    let convId = conversationId;

    // Create new conversation if needed
    if (!convId) {
      const conversation = await conversationRepository.create(userId, {
        title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
      });
      convId = conversation.id;
    }

    // Get existing messages
    const existingMessages = await conversationRepository.getMessages(convId);

    // Add user message
    await conversationRepository.addMessage(convId, "user", message);

    // Prepare all messages
    const allMessages: Message[] = [...existingMessages, { role: "user", content: message }];

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    let fullResponse = "";
    const finalConvId = convId;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "conversationId", value: finalConvId })}\n\n`)
          );

          // Stream the agent response
          for await (const chunk of streamAgent(userId, allMessages)) {
            // Check if this is a tool usage marker
            const toolMatch = chunk.match(/^__TOOL_USED__(.+)__$/);
            if (toolMatch) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "toolUsed", value: toolMatch[1] })}\n\n`)
              );
            } else {
              fullResponse += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", value: chunk })}\n\n`)
              );
            }
          }

          // Save the complete response
          await conversationRepository.addMessage(finalConvId, "assistant", fullResponse);

          // Signal completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", value: "Une erreur s'est produite" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
);
