import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// LLM Configuration - easily swappable
// To switch providers, just change this file

export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  // API key is read from GOOGLE_API_KEY env var
});

// Other providers:
// import { ChatAnthropic } from "@langchain/anthropic";
// export const llm = new ChatAnthropic({ model: "claude-sonnet-4-20250514" });

// import { ChatOpenAI } from "@langchain/openai";
// export const llm = new ChatOpenAI({ model: "gpt-4o" });

// import { ChatOllama } from "@langchain/ollama";
// export const llm = new ChatOllama({ model: "llama3" });
