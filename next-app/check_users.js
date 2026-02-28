const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw`PRAGMA table_info(users);`;
  console.log('Users columns:', columns);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
