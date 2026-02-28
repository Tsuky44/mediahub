
import { prisma } from './lib/prisma'

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { name: 'test' },
    include: { roleRef: true }
  })
  
  console.log('User:', JSON.stringify(user, null, 2))

  if (user?.roleRef) {
    const permissions = await prisma.permission.findMany({
      where: { roleId: user.roleRef.id }
    })
    console.log('Permissions:', JSON.stringify(permissions, null, 2))
  }
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
