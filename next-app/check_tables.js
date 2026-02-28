const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table';`;
  console.log('Tables:', tables);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
