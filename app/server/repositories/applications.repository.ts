import { db } from "~/db";
import {
  jobApplications,
  companies,
  contacts,
  type JobApplication,
  type Company,
  type Contact,
} from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type NewJobApplication = {
  title: string;
  description?: string | null;
  jobUrl?: string | null;
  companyId?: string | null;
  contactId?: string | null;
  status?: string;
  appliedAt?: Date | null;
  notes?: string | null;
};

export type UpdateJobApplication = Partial<NewJobApplication>;

export type JobApplicationWithRelations = JobApplication & {
  company: Company | null;
  contact: Contact | null;
};

export interface IJobApplicationRepository {
  findAll(userId: string): Promise<JobApplication[]>;
  findAllWithRelations(userId: string): Promise<JobApplicationWithRelations[]>;
  findById(userId: string, id: string): Promise<JobApplication | null>;
  findByIdWithRelations(userId: string, id: string): Promise<JobApplicationWithRelations | null>;
  create(userId: string, data: NewJobApplication): Promise<JobApplication>;
  update(userId: string, id: string, data: UpdateJobApplication): Promise<JobApplication | null>;
  updateStatus(userId: string, id: string, status: string): Promise<JobApplication | null>;
  delete(userId: string, id: string): Promise<void>;
}

export const jobApplicationRepository: IJobApplicationRepository = {
  async findAll(userId) {
    return db.query.jobApplications.findMany({
      where: eq(jobApplications.userId, userId),
      orderBy: [desc(jobApplications.updatedAt)],
    });
  },

  async findAllWithRelations(userId) {
    const apps = await db.query.jobApplications.findMany({
      where: eq(jobApplications.userId, userId),
      orderBy: [desc(jobApplications.updatedAt)],
    });

    const result: JobApplicationWithRelations[] = [];
    for (const app of apps) {
      const company = app.companyId
        ? await db.query.companies.findFirst({ where: eq(companies.id, app.companyId) })
        : null;
      const contact = app.contactId
        ? await db.query.contacts.findFirst({ where: eq(contacts.id, app.contactId) })
        : null;

      result.push({ ...app, company: company || null, contact: contact || null });
    }

    return result;
  },

  async findById(userId, id) {
    return db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.id, id), eq(jobApplications.userId, userId)),
    }) ?? null;
  },

  async findByIdWithRelations(userId, id) {
    const app = await db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.id, id), eq(jobApplications.userId, userId)),
    });

    if (!app) return null;

    const company = app.companyId
      ? await db.query.companies.findFirst({ where: eq(companies.id, app.companyId) })
      : null;
    const contact = app.contactId
      ? await db.query.contacts.findFirst({ where: eq(contacts.id, app.contactId) })
      : null;

    return { ...app, company: company || null, contact: contact || null };
  },

  async create(userId, data) {
    const [app] = await db
      .insert(jobApplications)
      .values({ ...data, userId })
      .returning();
    return app;
  },

  async update(userId, id, data) {
    const [updated] = await db
      .update(jobApplications)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(jobApplications.id, id), eq(jobApplications.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async updateStatus(userId, id, status) {
    const [updated] = await db
      .update(jobApplications)
      .set({
        status,
        appliedAt: status === "applied" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(jobApplications.id, id), eq(jobApplications.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async delete(userId, id) {
    await db.delete(jobApplications).where(
      and(eq(jobApplications.id, id), eq(jobApplications.userId, userId))
    );
  },
};
