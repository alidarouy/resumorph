import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { llm } from "./llm";
import { createTools } from "./tools";
import { db } from "~/db";
import { experiences, skills, experienceSkills } from "~/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { Message } from "./agent";

const BASE_SYSTEM_PROMPT = `Tu es un assistant pour une application de gestion de candidatures.
Tu aides l'utilisateur à gérer ses contacts, entreprises et candidatures.

Tu peux:
- Ajouter et lister des contacts (prénom, nom, email, LinkedIn)
- Ajouter et lister des entreprises (nom, description, site web, LinkedIn)
- Ajouter et lister des candidatures (titre du poste, entreprise, description, URL, statut, notes)

Pour les candidatures, si l'utilisateur mentionne une entreprise qui n'existe pas, elle sera créée automatiquement.

Sois concis et utile. Réponds en français.
Quand tu crées quelque chose, confirme les informations ajoutées.`;

// Fetch user's CV (experiences and skills)
async function getUserCV(userId: string): Promise<string> {
  const userExperiences = await db.query.experiences.findMany({
    where: eq(experiences.userId, userId),
    orderBy: (experiences, { desc }) => [desc(experiences.startDate)],
  });

  if (userExperiences.length === 0) {
    return "";
  }

  const experiencesWithSkills = [];
  for (const exp of userExperiences) {
    const expSkillLinks = await db.query.experienceSkills.findMany({
      where: eq(experienceSkills.experienceId, exp.id),
    });

    const skillIds = expSkillLinks.map((link) => link.skillId);
    const expSkills =
      skillIds.length > 0
        ? await db.query.skills.findMany({
            where: inArray(skills.id, skillIds),
          })
        : [];

    experiencesWithSkills.push({
      ...exp,
      skills: expSkills.map((s) => s.name),
    });
  }

  let cvText = "\n\n--- CV DE L'UTILISATEUR ---\n";

  for (const exp of experiencesWithSkills) {
    const endDate = exp.current ? "Présent" : exp.endDate || "";
    cvText += `\n**${exp.title}** chez ${exp.company}`;
    cvText += `\n${exp.startDate} - ${endDate}`;
    if (exp.location) cvText += ` | ${exp.location}`;
    if (exp.description) cvText += `\n${exp.description}`;
    if (exp.skills.length > 0) cvText += `\nCompétences: ${exp.skills.join(", ")}`;
    cvText += "\n";
  }

  const allSkills = [...new Set(experiencesWithSkills.flatMap((e) => e.skills))];
  if (allSkills.length > 0) {
    cvText += `\n**Toutes les compétences:** ${allSkills.join(", ")}`;
  }

  cvText += "\n--- FIN DU CV ---\n";
  cvText += "\nUtilise ces informations pour aider l'utilisateur avec ses candidatures, ";
  cvText += "par exemple pour identifier les compétences pertinentes pour une offre.";

  return cvText;
}

export async function* streamAgent(
  userId: string,
  messages: Message[]
): AsyncGenerator<string, void, unknown> {
  const tools = createTools(userId);
  const llmWithTools = llm.bindTools(tools);

  const userCV = await getUserCV(userId);
  const systemPrompt = BASE_SYSTEM_PROMPT + userCV;

  const langchainMessages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...messages.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;

    // Stream the LLM response
    const stream = await llmWithTools.stream(langchainMessages);

    let fullContent = "";
    let toolCalls: any[] = [];

    for await (const chunk of stream) {
      // Get tool calls from the chunk (Gemini sends complete tool calls)
      if (chunk.tool_calls && chunk.tool_calls.length > 0) {
        toolCalls = chunk.tool_calls;
      }

      // Accumulate content - but skip if it's a function call JSON
      if (chunk.content) {
        // Skip content that is function call metadata (array with functionCall)
        if (Array.isArray(chunk.content)) {
          const hasToolCall = chunk.content.some(
            (item: any) => item?.type === "functionCall" || item?.functionCall
          );
          if (hasToolCall) continue;
        }

        // Also skip if it's a stringified function call
        const text = typeof chunk.content === "string"
          ? chunk.content
          : JSON.stringify(chunk.content);

        if (text.includes('"type":"functionCall"') || text.includes('"functionCall"')) {
          continue;
        }

        fullContent += text;
        yield text;
      }
    }

    // If no tool calls, we're done
    if (toolCalls.length === 0) {
      return;
    }

    // Tool calls from Gemini are already parsed objects
    const parsedToolCalls = toolCalls.map(tc => ({
      name: tc.name,
      id: tc.id,
      args: tc.args,
    }));

    // Add AI message with tool calls to history
    const aiMessage = new AIMessage({
      content: fullContent,
      tool_calls: parsedToolCalls,
    });
    langchainMessages.push(aiMessage);

    // Execute tool calls
    for (const toolCall of parsedToolCalls) {
      const tool = tools.find((t) => t.name === toolCall.name);

      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }

      const toolResult = await tool.invoke(toolCall.args);

      langchainMessages.push({
        role: "tool",
        content: toolResult,
        tool_call_id: toolCall.id,
        name: toolCall.name,
      } as unknown as BaseMessage);
    }
  }

  yield "Désolé, je n'ai pas pu traiter ta demande. Essaie de reformuler.";
}
