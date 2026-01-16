import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import {
  experiences,
  skills,
  experienceSkills,
  type Experience,
  type Skill,
  type Company,
  type Contact,
  type JobApplication,
} from "~/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  contactRepository,
  companyRepository,
  jobApplicationRepository,
  type JobApplicationWithRelations,
} from "./repositories";

// Re-export types from repositories for backward compatibility
export type { JobApplicationWithRelations } from "./repositories";

// Type for experience with skills
export type ExperienceWithSkills = Experience & { skills: Skill[] };

// ============================================
// Experience functions (keeping direct DB access for now)
// ============================================

export const getExperiences = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string } }): Promise<ExperienceWithSkills[]> => {
    const { userId } = ctx.data;

    if (!userId) {
      return [];
    }

    const exps = await db.query.experiences.findMany({
      where: eq(experiences.userId, userId),
      orderBy: (experiences, { desc }) => [desc(experiences.startDate)],
    });

    // Get skills for each experience
    const result: ExperienceWithSkills[] = [];
    for (const exp of exps) {
      const expSkillLinks = await db.query.experienceSkills.findMany({
        where: eq(experienceSkills.experienceId, exp.id),
      });

      const skillIds = expSkillLinks.map(link => link.skillId);
      const expSkills = skillIds.length > 0
        ? await db.query.skills.findMany({
            where: inArray(skills.id, skillIds),
          })
        : [];

      result.push({ ...exp, skills: expSkills });
    }

    return result;
  }
);

type AddExperienceInput = {
  userId: string;
  experience: Omit<Experience, "id" | "userId" | "createdAt" | "updatedAt">;
  skillNames?: string[];
};

export const addExperience = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: AddExperienceInput }) => {
    const { userId, experience, skillNames = [] } = ctx.data;

    if (!userId) {
      throw new Error("Non authentifié");
    }

    const [newExperience] = await db
      .insert(experiences)
      .values({
        ...experience,
        userId,
      })
      .returning();

    // Handle skills
    for (const skillName of skillNames) {
      let skill = await db.query.skills.findFirst({
        where: and(eq(skills.userId, userId), eq(skills.name, skillName)),
      });

      if (!skill) {
        const [newSkill] = await db
          .insert(skills)
          .values({ userId, name: skillName })
          .returning();
        skill = newSkill;
      }

      await db.insert(experienceSkills).values({
        experienceId: newExperience.id,
        skillId: skill.id,
      });
    }

    return newExperience;
  }
);

type UpdateExperienceInput = {
  userId: string;
  experience: Experience;
  skillNames?: string[];
};

export const updateExperience = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: UpdateExperienceInput }) => {
    const { userId, experience, skillNames } = ctx.data;

    if (!userId) {
      throw new Error("Non authentifié");
    }

    const [updated] = await db
      .update(experiences)
      .set({
        title: experience.title,
        company: experience.company,
        location: experience.location,
        startDate: experience.startDate,
        endDate: experience.endDate,
        current: experience.current,
        description: experience.description,
        updatedAt: new Date(),
      })
      .where(and(eq(experiences.id, experience.id), eq(experiences.userId, userId)))
      .returning();

    if (skillNames !== undefined) {
      await db.delete(experienceSkills).where(eq(experienceSkills.experienceId, experience.id));

      for (const skillName of skillNames) {
        let skill = await db.query.skills.findFirst({
          where: and(eq(skills.userId, userId), eq(skills.name, skillName)),
        });

        if (!skill) {
          const [newSkill] = await db
            .insert(skills)
            .values({ userId, name: skillName })
            .returning();
          skill = newSkill;
        }

        await db.insert(experienceSkills).values({
          experienceId: experience.id,
          skillId: skill.id,
        });
      }
    }

    return updated;
  }
);

export const deleteExperience = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; id: string } }) => {
    const { userId, id } = ctx.data;

    if (!userId) {
      throw new Error("Non authentifié");
    }

    await db.delete(experiences).where(
      and(eq(experiences.id, id), eq(experiences.userId, userId))
    );

    return { success: true };
  }
);

// ============================================
// Skills functions
// ============================================

export const getSkills = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string } }): Promise<Skill[]> => {
    const { userId } = ctx.data;

    if (!userId) {
      return [];
    }

    return db.query.skills.findMany({
      where: eq(skills.userId, userId),
      orderBy: (skills, { asc }) => [asc(skills.name)],
    });
  }
);

export const addSkill = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; name: string } }) => {
    const { userId, name } = ctx.data;

    if (!userId) {
      throw new Error("Non authentifié");
    }

    const [newSkill] = await db
      .insert(skills)
      .values({ userId, name })
      .returning();

    return newSkill;
  }
);

export const deleteSkill = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; id: string } }) => {
    const { userId, id } = ctx.data;

    if (!userId) {
      throw new Error("Non authentifié");
    }

    await db.delete(skills).where(
      and(eq(skills.id, id), eq(skills.userId, userId))
    );

    return { success: true };
  }
);

// ============================================
// Companies functions (using repository)
// ============================================

export const getCompanies = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string } }): Promise<Company[]> => {
    const { userId } = ctx.data;
    if (!userId) return [];
    return companyRepository.findAll(userId);
  }
);

export const addCompany = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; company: Omit<Company, "id" | "userId" | "createdAt" | "updatedAt"> } }) => {
    const { userId, company } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    return companyRepository.create(userId, company);
  }
);

export const updateCompany = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; company: Company } }) => {
    const { userId, company } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    return companyRepository.update(userId, company.id, company);
  }
);

export const deleteCompany = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; id: string } }) => {
    const { userId, id } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    await companyRepository.delete(userId, id);
    return { success: true };
  }
);

// ============================================
// Contacts functions (using repository)
// ============================================

export const getContacts = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string } }): Promise<Contact[]> => {
    const { userId } = ctx.data;
    if (!userId) return [];
    return contactRepository.findAll(userId);
  }
);

export const addContact = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; contact: Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt"> } }) => {
    const { userId, contact } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    return contactRepository.create(userId, contact);
  }
);

export const updateContact = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; contact: Contact } }) => {
    const { userId, contact } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    return contactRepository.update(userId, contact.id, contact);
  }
);

export const deleteContact = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; id: string } }) => {
    const { userId, id } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    await contactRepository.delete(userId, id);
    return { success: true };
  }
);

// ============================================
// Job Applications functions (using repository)
// ============================================

export const getJobApplications = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string } }): Promise<JobApplicationWithRelations[]> => {
    const { userId } = ctx.data;
    if (!userId) return [];
    return jobApplicationRepository.findAllWithRelations(userId);
  }
);

export const addJobApplication = createServerFn({ method: "POST" }).handler(
  async (ctx: {
    data: {
      userId: string;
      application: Omit<JobApplication, "id" | "userId" | "createdAt" | "updatedAt">;
    };
  }) => {
    const { userId, application } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    return jobApplicationRepository.create(userId, application);
  }
);

export const updateJobApplication = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; application: JobApplication } }) => {
    const { userId, application } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    return jobApplicationRepository.update(userId, application.id, application);
  }
);

export const updateJobApplicationStatus = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; id: string; status: string } }) => {
    const { userId, id, status } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    return jobApplicationRepository.updateStatus(userId, id, status);
  }
);

export const deleteJobApplication = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { userId: string; id: string } }) => {
    const { userId, id } = ctx.data;
    if (!userId) throw new Error("Non authentifié");
    await jobApplicationRepository.delete(userId, id);
    return { success: true };
  }
);
