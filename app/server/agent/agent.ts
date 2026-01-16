import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { llm } from "./llm";
import { createTools } from "./tools";
import { db } from "~/db";
import { experiences, skills, experienceSkills } from "~/db/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_SYSTEM_PROMPT = `Tu es un assistant pour une application de gestion de candidatures.
Tu aides l'utilisateur à gérer ses contacts, entreprises et candidatures.

Tu peux:
- Ajouter et lister des contacts (prénom, nom, email, LinkedIn)
- Ajouter et lister des entreprises (nom, description, site web, LinkedIn)
- Ajouter et lister des candidatures (titre du poste, entreprise, description, URL, statut, notes)

Pour les candidatures, si l'utilisateur mentionne une entreprise qui n'existe pas, elle sera créée automatiquement.

Sois concis et utile. Réponds en français.
Quand tu crées quelque chose, confirme les informations ajoutées.`;

export type Message = {
  role: "user" | "assistant";
  content: string;
};

// Fetch user's CV (experiences and skills)
async function getUserCV(userId: string): Promise<string> {
  const userExperiences = await db.query.experiences.findMany({
    where: eq(experiences.userId, userId),
    orderBy: (experiences, { desc }) => [desc(experiences.startDate)],
  });

  if (userExperiences.length === 0) {
    return "";
  }

  // Get skills for each experience
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

  // Format CV as text
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

  // Collect all unique skills
  const allSkills = [...new Set(experiencesWithSkills.flatMap((e) => e.skills))];
  if (allSkills.length > 0) {
    cvText += `\n**Toutes les compétences:** ${allSkills.join(", ")}`;
  }

  cvText += "\n--- FIN DU CV ---\n";
  cvText += "\nUtilise ces informations pour aider l'utilisateur avec ses candidatures, ";
  cvText += "par exemple pour identifier les compétences pertinentes pour une offre.";

  return cvText;
}

export async function runAgent(
  userId: string,
  messages: Message[]
): Promise<string> {
  const tools = createTools(userId);
  const llmWithTools = llm.bindTools(tools);

  // Get user's CV and add to system prompt
  const userCV = await getUserCV(userId);
  const systemPrompt = BASE_SYSTEM_PROMPT + userCV;

  // Convert messages to LangChain format
  const langchainMessages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...messages.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  // Agent loop - keep running until we get a final response
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;

    const response = await llmWithTools.invoke(langchainMessages);
    langchainMessages.push(response);

    // Check if there are tool calls
    if (!response.tool_calls || response.tool_calls.length === 0) {
      // No tool calls, return the response
      return typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
    }

    // Execute tool calls
    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);

      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }

      const toolResult = await tool.invoke(toolCall.args);

      // Add tool result to messages
      langchainMessages.push({
        role: "tool",
        content: toolResult,
        tool_call_id: toolCall.id,
        name: toolCall.name,
      } as unknown as BaseMessage);
    }
  }

  return "Désolé, je n'ai pas pu traiter ta demande. Essaie de reformuler.";
}
