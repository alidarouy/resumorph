import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/tanstack-react-start";
import ReactMarkdown from "react-markdown";
import {
  chatStream,
  getConversations,
  getConversation,
  deleteConversation,
  type Message,
} from "~/server/agent";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/assistant")({
  component: AssistantPage,
});

function AssistantPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: "/" });
    }
  }, [isSignedIn, isLoaded, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Fetch conversations list
  const { data: conversations } = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => getConversations({ data: { userId: userId! } }),
    enabled: isSignedIn && !!userId,
  });

  // Load conversation when selected
  const loadConversation = async (convId: string) => {
    if (!userId) return;
    const conv = await getConversation({ data: { userId, conversationId: convId } });
    if (conv) {
      setConversationId(conv.id);
      setMessages(
        conv.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    if (confirm("Supprimer cette conversation ?")) {
      await deleteConversation({ data: { userId, conversationId: convId } });
      await queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      if (conversationId === convId) {
        startNewConversation();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId || isLoading) return;

    const currentInput = input.trim();
    const userMessage: Message = { role: "user", content: currentInput };

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);

    // Track which tools were used to know which queries to invalidate
    const toolsUsed = new Set<string>();

    try {
      const response = await chatStream({
        data: {
          userId,
          message: currentInput,
          conversationId: conversationId || undefined,
        },
      });

      if (!(response instanceof Response) || !response.ok) {
        throw new Error("Erreur de streaming");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Pas de reader disponible");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.type === "conversationId" && !conversationId) {
              setConversationId(data.value);
            } else if (data.type === "toolUsed") {
              toolsUsed.add(data.value);
            } else if (data.type === "text") {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === "assistant") {
                  lastMessage.content += data.value;
                }
                return newMessages;
              });
            } else if (data.type === "error") {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === "assistant") {
                  lastMessage.content = data.value;
                }
                return newMessages;
              });
            }
          }
        }
      }

      // Invalidate queries based on which tools were used
      const invalidations: Promise<void>[] = [
        queryClient.invalidateQueries({ queryKey: ["conversations", userId] }),
      ];

      // Map tool names to query keys
      const toolToQueryKey: Record<string, string[]> = {
        create_application: ["applications"],
        list_applications: ["applications"],
        update_application: ["applications"],
        create_contact: ["contacts"],
        list_contacts: ["contacts"],
        create_company: ["companies"],
        list_companies: ["companies"],
      };

      for (const tool of toolsUsed) {
        const queryKeys = toolToQueryKey[tool];
        if (queryKeys) {
          for (const key of queryKeys) {
            invalidations.push(queryClient.invalidateQueries({ queryKey: [key] }));
          }
        }
      }

      await Promise.all(invalidations);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === "assistant") {
          lastMessage.content = "Désolé, une erreur s'est produite. Réessaie.";
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const suggestions = [
    { icon: "👤", text: "Ajoute un contact", query: "Ajoute le contact Jean Dupont, email: jean@example.com" },
    { icon: "🏢", text: "Crée une entreprise", query: "Crée l'entreprise TechCorp, site: techcorp.com" },
    { icon: "📝", text: "Nouvelle candidature", query: "Crée une candidature pour Développeur Senior chez Google" },
    { icon: "📋", text: "Liste mes candidatures", query: "Liste toutes mes candidatures" },
  ];

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-[73px] flex bg-gradient-to-br from-background via-background to-muted/30">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } transition-all duration-300 ease-in-out border-r border-border/40 bg-card/50 backdrop-blur-md flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-border/40">
          <Button
            onClick={startNewConversation}
            className="w-full gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-0"
            variant="outline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations?.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                conversationId === conv.id
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "hover:bg-muted/60"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                conversationId === conv.id ? "bg-primary/20" : "bg-muted"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conv.title || "Sans titre"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(conv.updatedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          {conversations?.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                Aucune conversation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-md px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted/60 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Assistant IA</h1>
              <p className="text-xs text-muted-foreground">
                Gère tes candidatures en langage naturel
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-xl shadow-primary/10">
                  <svg
                    className="w-10 h-10 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Comment puis-je t'aider ?</h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Je peux gérer tes contacts, entreprises et candidatures. Dis-moi ce que tu veux faire.
                </p>

                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(suggestion.query)}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-left group"
                    >
                      <span className="text-2xl">{suggestion.icon}</span>
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">
                        {suggestion.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-gradient-to-br from-primary/20 to-primary/5"
                    }`}>
                      {message.role === "user" ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-md"
                          : "bg-card border border-border/50 shadow-sm rounded-tl-md"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : message.content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-3 prose-strong:text-foreground">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.15s]" />
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border/40 bg-card/30 backdrop-blur-md p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-card border border-border/50 rounded-2xl shadow-lg shadow-black/5 focus-within:border-primary/50 focus-within:shadow-primary/10 transition-all duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écris ton message... (Shift+Enter pour nouvelle ligne)"
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent px-4 py-3 resize-none outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 max-h-[200px]"
              />
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="m-1.5 rounded-xl h-10 w-10 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60 text-center mt-2">
              L'assistant peut faire des erreurs. Vérifie les informations importantes.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
