
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  
  // Create default admin user if no users exist
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    console.log('Creating default admin user...')
    // Note: In a real app, you'd want to prompt for credentials or use env vars
    // For now, we assume users are created via the app or initial setup flow
    console.log('No users found. Please use the application setup flow to create the first user.')
  } else {
    console.log('Users already exist, skipping initial user creation.')
  }

  console.log('✅ Seeding completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
