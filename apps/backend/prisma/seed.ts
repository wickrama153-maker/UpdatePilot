import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Default User Settings
  await prisma.userSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      theme: 'dark',
      scanIntervalHours: 24,
      autoCheckUpdates: true,
      notifyOnUpdate: true,
      telemetryEnabled: false,
      retentionDays: 90,
    },
  });

  // Default Local Admin User
  await prisma.user.upsert({
    where: { email: 'admin@updatepilot.local' },
    update: {},
    create: {
      email: 'admin@updatepilot.local',
      name: 'System Administrator',
      passwordHash: 'argon2_or_bcrypt_placeholder_hash',
      role: 'ADMIN',
    },
  });

  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
