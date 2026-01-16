import { db } from "~/db";
import { companies, type Company } from "~/db/schema";
import { eq, and, asc } from "drizzle-orm";

export type NewCompany = {
  name: string;
  description?: string | null;
  logo?: string | null;
  linkedin?: string | null;
  website?: string | null;
};

export type UpdateCompany = Partial<NewCompany>;

export interface ICompanyRepository {
  findAll(userId: string): Promise<Company[]>;
  findById(userId: string, id: string): Promise<Company | null>;
  create(userId: string, data: NewCompany): Promise<Company>;
  update(userId: string, id: string, data: UpdateCompany): Promise<Company | null>;
  delete(userId: string, id: string): Promise<void>;
}

export const companyRepository: ICompanyRepository = {
  async findAll(userId) {
    return db.query.companies.findMany({
      where: eq(companies.userId, userId),
      orderBy: [asc(companies.name)],
    });
  },

  async findById(userId, id) {
    return db.query.companies.findFirst({
      where: and(eq(companies.id, id), eq(companies.userId, userId)),
    }) ?? null;
  },

  async create(userId, data) {
    const [company] = await db
      .insert(companies)
      .values({ ...data, userId })
      .returning();
    return company;
  },

  async update(userId, id, data) {
    const [updated] = await db
      .update(companies)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(companies.id, id), eq(companies.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async delete(userId, id) {
    await db.delete(companies).where(
      and(eq(companies.id, id), eq(companies.userId, userId))
    );
  },
};
