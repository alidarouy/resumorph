import { db } from "../app/db";
import {
  experiences,
  skills,
  experienceSkills,
} from "../app/db/schema";
import { eq, and } from "drizzle-orm";

const USER_ID = process.argv[2];

if (!USER_ID) {
  console.error("Usage: bun run scripts/seed.ts <userId>");
  console.error("Get your userId from Clerk dashboard or browser devtools");
  process.exit(1);
}

async function getOrCreateSkill(userId: string, name: string) {
  let skill = await db.query.skills.findFirst({
    where: and(eq(skills.userId, userId), eq(skills.name, name)),
  });

  if (!skill) {
    const [newSkill] = await db
      .insert(skills)
      .values({ userId, name })
      .returning();
    skill = newSkill;
  }

  return skill;
}

async function seed() {
  console.log("🌱 Seeding database for user:", USER_ID);

  const experiencesData = [
    {
      title: "Product Engineer & Consultant",
      company: "Freelance",
      location: "Lyon, France (Remote)",
      startDate: "2024-11",
      endDate: null,
      current: true,
      description: `Partnering with SMEs (PME) and Mid-market companies (ETI) to bridge the gap between their business data and AI-driven growth. Specializing in building custom, production-ready AI tools and automated data systems.

Key Services & Impact:
• AI Strategy & Implementation: Helping business leaders identify high-impact AI use cases and executing them from prototype to production
• Custom AI Tooling: Developing bespoke AI applications (LLM integration, automated document processing, intelligent agents)
• Robust Data Integration: Building reliable, type-safe data pipelines for high-quality, real-time business data
• Product-Led Engineering: Managing end-to-end product lifecycle from requirements to cloud deployment
• Modernization of Legacy Systems: Migrating existing infrastructures to support modern AI and Cloud capabilities`,
      skills: ["TypeScript", "PostgreSQL", "Python", "React.js", "Go", "Terraform", "CI/CD", "AI"],
    },
    {
      title: "Founder & CEO",
      company: "Flowr",
      location: "Lyon, France",
      startDate: "2024-11",
      endDate: "2025-12",
      current: false,
      description: `Founded Flowr, an Integration-as-a-Service (IaaS) platform for B2B SaaS companies requiring high-scale, reliable data connectivity. Designed with "Type-Safe" architecture for end-to-end data compatibility.

Key Achievements:
• Type-Safe Integration Engine: Proprietary orchestration engine with strictly typed data flows
• High-Performance Data Exchange: Optimized throughput with high-speed exchange formats
• Scalable Infrastructure: Built platform capable of handling massive data volumes at enterprise scale
• Full-Stack Ownership: Architected entire system focusing on developer experience and observability`,
      skills: ["GCP", "Go", "Terraform", "PostgreSQL", "React.js"],
    },
    {
      title: "Head of AI & Innovation",
      company: "Agicap",
      location: "Lyon, France",
      startDate: "2023-04",
      endDate: "2024-11",
      current: false,
      description: `Founding Team Member leading AI & Innovation initiatives at Agicap, a leading cash flow management SaaS platform.`,
      skills: ["AI", "LLM", "GCP", "Terraform", "CI/CD", "Management", "SaaS"],
    },
    {
      title: "Head of Data",
      company: "Agicap",
      location: "Lyon, France",
      startDate: "2020-06",
      endDate: "2023-06",
      current: false,
      description: `Founding Team Member leading Data initiatives at Agicap. Built and scaled data infrastructure and team.`,
      skills: ["TypeScript", "JavaScript", "GCP", "Terraform", "CI/CD", "Management", "SaaS"],
    },
    {
      title: "Cloud Software Engineer",
      company: "SNCF",
      location: "Lyon, France",
      startDate: "2020-01",
      endDate: "2020-05",
      current: false,
      description: `Key contributor to major industrial digital transformation, migrating predictive maintenance algorithms for French railway fleet to AWS Cloud.

Key Achievements:
• Cloud Migration: Spearheaded migration of legacy applications to modern AWS infrastructure
• Serverless Architecture: Designed scalable architecture using AWS Lambda
• Algorithm Optimization: Refactored Python-based maintenance algorithms for improved performance
• Data Engineering: Built pipelines with AWS S3, Glue, Athena, and DynamoDB`,
      skills: ["AWS", "Python", "Terraform", "CI/CD"],
    },
    {
      title: "Data Scientist",
      company: "Juicy Publishing",
      location: "Lyon, France",
      startDate: "2019-12",
      endDate: "2020-01",
      current: false,
      description: `Designed, developed, and deployed machine learning model for predicting mobile application revenue (LTV forecasting).

• Engineered data pipelines using Python and Amazon Redshift
• Integrated predictive model with Mode Analytics for business insights`,
      skills: ["Python", "AI", "Amazon Redshift"],
    },
    {
      title: "Fullstack Software Engineer",
      company: "The Freelance Network",
      location: "Lyon, France",
      startDate: "2019-07",
      endDate: "2020-01",
      current: false,
      description: `Sole developer responsible for end-to-end design, development, and production launch of a social networking platform for freelancers.

Key Achievements:
• Solo Project Execution: Owned entire development lifecycle
• Full-Stack Architecture: MERN stack (MongoDB, Express, React, Node.js)
• Production Launch & DevOps: Deployed with Docker and monitoring
• Technical Ownership: Managed Git versioning and CI/CD`,
      skills: ["TypeScript", "JavaScript", "React.js", "Node.js", "Docker"],
    },
    {
      title: "Founding AI Engineer & Fullstack Engineer",
      company: "Botgen",
      location: "Lyon, France",
      startDate: "2018-07",
      endDate: "2019-07",
      current: false,
      description: `Founding Engineer building core infrastructure of end-to-end NLU (Natural Language Understanding) platform.

Key Achievements:
• Founding Architecture: Initial design of SaaS platform for model training and deployment
• NLP Pipeline & NER: High-performance models using Rasa and Spacy
• End-to-End Automation: Automated workflows for training set creation
• Product Delivery: Deployed production Facebook chatbot for Le Petit Paumé`,
      skills: ["TypeScript", "JavaScript", "Python", "React.js", "GraphQL", "AI", "SaaS"],
    },
    {
      title: "Software Engineer Intern",
      company: "TECHFUN",
      location: "Sainte-Hélène du Lac, France",
      startDate: "2017-06",
      endDate: "2017-09",
      current: false,
      description: `Developed custom Excel-based automation module to streamline design process for summer toboggan runs.

Key Achievements:
• Developed selection tool for configuring rail components
• Integrated Excel with AutoCAD for automated 3D modeling
• Achieved 10x reduction in design time`,
      skills: ["C#", "VBA", "Python"],
    },
  ];

  console.log("\n📝 Creating experiences and skills...\n");

  for (const exp of experiencesData) {
    console.log(`  → ${exp.title} @ ${exp.company}`);

    const [createdExp] = await db
      .insert(experiences)
      .values({
        userId: USER_ID,
        title: exp.title,
        company: exp.company,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        current: exp.current,
        description: exp.description,
      })
      .returning();

    for (const skillName of exp.skills) {
      const skill = await getOrCreateSkill(USER_ID, skillName);
      await db.insert(experienceSkills).values({
        experienceId: createdExp.id,
        skillId: skill.id,
      });
    }
  }

  console.log(`\n✅ Created ${experiencesData.length} experiences`);

  const allSkills = await db.query.skills.findMany({
    where: eq(skills.userId, USER_ID),
  });
  console.log(`✅ Created ${allSkills.length} unique skills`);

  console.log("\n🎉 Seed completed successfully!\n");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
