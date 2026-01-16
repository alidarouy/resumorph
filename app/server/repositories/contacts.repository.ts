import { db } from "~/db";
import { contacts, type Contact } from "~/db/schema";
import { eq, and, asc } from "drizzle-orm";

export type NewContact = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  linkedin?: string | null;
  companyId?: string | null;
};

export type UpdateContact = Partial<NewContact>;

export interface IContactRepository {
  findAll(userId: string): Promise<Contact[]>;
  findById(userId: string, id: string): Promise<Contact | null>;
  create(userId: string, data: NewContact): Promise<Contact>;
  update(userId: string, id: string, data: UpdateContact): Promise<Contact | null>;
  delete(userId: string, id: string): Promise<void>;
}

export const contactRepository: IContactRepository = {
  async findAll(userId) {
    return db.query.contacts.findMany({
      where: eq(contacts.userId, userId),
      orderBy: [asc(contacts.lastName), asc(contacts.firstName)],
    });
  },

  async findById(userId, id) {
    return db.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.userId, userId)),
    }) ?? null;
  },

  async create(userId, data) {
    const [contact] = await db
      .insert(contacts)
      .values({ ...data, userId })
      .returning();
    return contact;
  },

  async update(userId, id, data) {
    const [updated] = await db
      .update(contacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async delete(userId, id) {
    await db.delete(contacts).where(
      and(eq(contacts.id, id), eq(contacts.userId, userId))
    );
  },
};
