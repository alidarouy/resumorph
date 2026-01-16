import { createAddContactTool, createListContactsTool } from "./contacts.tool";
import { createAddCompanyTool, createListCompaniesTool } from "./companies.tool";
import { createAddApplicationTool, createListApplicationsTool, createUpdateApplicationTool } from "./applications.tool";

// Factory function to create all tools with user context
export const createTools = (userId: string) => [
  // Contacts
  createAddContactTool(userId),
  createListContactsTool(userId),
  // Companies
  createAddCompanyTool(userId),
  createListCompaniesTool(userId),
  // Applications
  createAddApplicationTool(userId),
  createListApplicationsTool(userId),
  createUpdateApplicationTool(userId),
];

export { createAddContactTool, createListContactsTool };
export { createAddCompanyTool, createListCompaniesTool };
export { createAddApplicationTool, createListApplicationsTool, createUpdateApplicationTool };
