import "dotenv/config";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

// ponytail: ws só necessário no Node.js; edge/Vercel tem WebSocket nativo
neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Organização principal
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: { name: "Demo Organização", slug: "demo-org", active: true },
  });

  console.log(`Organização: ${org.name} (${org.id})`);

  // Usuários por role
  const users = [
    { name: "Admin Silva",       email: "admin@demo.com",         role: "ADMIN"         as const },
    { name: "Gestor Santos",     email: "gestor@demo.com",        role: "MANAGER"       as const },
    { name: "Tesoureiro Costa",  email: "tesoureiro@demo.com",    role: "TREASURER"     as const },
    { name: "Comunicação Lima",  email: "comunicacao@demo.com",   role: "COMMUNICATION" as const },
    { name: "Auditor Rocha",     email: "auditor@demo.com",       role: "AUDITOR"       as const },
    { name: "Membro Oliveira",   email: "membro@demo.com",        role: "MEMBER"        as const },
  ];

  const passwordHash = await bcrypt.hash("senha123", 12);

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email_organizationId: { email: u.email, organizationId: org.id } },
      update: {},
      create: { ...u, organizationId: org.id, passwordHash, active: true },
    });
    console.log(`Usuário: ${user.name} (${user.role})`);
  }

  // Projeto de exemplo
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@demo.com", organizationId: org.id } });

  const project = await prisma.project.upsert({
    where: { publicSlug: "reforma-sede-2025" },
    update: {},
    create: {
      organizationId: org.id,
      createdById: adminUser!.id,
      name: "Reforma da Sede 2025",
      description: "Projeto de reforma completa da sede da organização, incluindo pintura, elétrica e mobiliário.",
      status: "ACTIVE",
      isPublic: true,
      publicSlug: "reforma-sede-2025",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    },
  });

  console.log(`Projeto: ${project.name} (${project.id})`);

  // Iniciativas
  const iniciativas = [
    { name: "Pintura Geral",       goal: 5000,  status: "IN_PROGRESS" as const },
    { name: "Instalação Elétrica", goal: 8000,  status: "COMPLETED"   as const },
    { name: "Mobiliário",          goal: 12000, status: "IN_PROGRESS" as const },
  ];

  for (const i of iniciativas) {
    const ini = await prisma.initiative.create({
      data: {
        projectId: project.id,
        organizationId: org.id,
        name: i.name,
        goal: i.goal,
        status: i.status,
      },
    });
    console.log(`Iniciativa: ${ini.name}`);
  }

  // Posts na timeline
  const comunicacaoUser = await prisma.user.findFirst({ where: { email: "comunicacao@demo.com", organizationId: org.id } });

  const posts = [
    { content: "Iniciamos as obras de pintura da fachada. Equipe já está trabalhando!", type: "TEXT" as const },
    { content: "Instalação elétrica concluída com sucesso! Toda a fiação foi renovada.", type: "TEXT" as const },
    { content: "Recebemos doação de cadeiras da empresa parceira. Muito obrigado!", type: "TEXT" as const },
  ];

  for (const p of posts) {
    await prisma.timelinePost.create({
      data: { ...p, projectId: project.id, organizationId: org.id, authorId: comunicacaoUser!.id },
    });
  }

  console.log("Timeline: 3 posts criados");

  // Movimentações financeiras
  const tesoureiro = await prisma.user.findFirst({ where: { email: "tesoureiro@demo.com", organizationId: org.id } });
  const initiative = await prisma.initiative.findFirst({ where: { projectId: project.id } });

  await prisma.financialEntry.createMany({
    data: [
      { projectId: project.id, organizationId: org.id, createdById: tesoureiro!.id, initiativeId: initiative!.id, description: "Doação membro João", amount: 500, date: new Date("2025-02-01") },
      { projectId: project.id, organizationId: org.id, createdById: tesoureiro!.id, initiativeId: initiative!.id, description: "Campanha online", amount: 3200, date: new Date("2025-03-15") },
    ],
  });

  await prisma.financialExit.createMany({
    data: [
      { projectId: project.id, organizationId: org.id, createdById: tesoureiro!.id, initiativeId: initiative!.id, description: "Tintas e materiais", amount: 1800, supplier: "Tudo Tinta Ltda", date: new Date("2025-02-10") },
      { projectId: project.id, organizationId: org.id, createdById: tesoureiro!.id, initiativeId: initiative!.id, description: "Mão de obra pintura", amount: 2000, supplier: "Pinturas Silva", date: new Date("2025-02-20") },
    ],
  });

  console.log("Financeiro: entradas e saídas criadas");
  console.log("\nSeed concluído.");
  console.log("\nCredenciais de acesso (senha: senha123):");
  users.forEach(u => console.log(`  ${u.role.padEnd(15)} → ${u.email}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
