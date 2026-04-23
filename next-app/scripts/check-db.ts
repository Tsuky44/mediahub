
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Checking tables...')
    const tables: any[] = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table';`
    console.log('Tables:', tables.map(t => t.name).join(', '))

    const hasEmby = tables.some(t => t.name === 'emby_activity_log')
    if (hasEmby) {
        console.log('emby_activity_log table FOUND')
        const embySchema: any[] = await prisma.$queryRaw`SELECT sql FROM sqlite_master WHERE name='emby_activity_log';`
        console.log('Emby Schema:', embySchema[0]?.sql)
    } else {
        console.log('emby_activity_log table NOT FOUND')
    }

    const hasAudit = tables.some(t => t.name === 'audit_logs')
    if (hasAudit) {
        console.log('audit_logs table FOUND')
        const auditSchema: any[] = await prisma.$queryRaw`SELECT sql FROM sqlite_master WHERE name='audit_logs';`
        console.log('Audit Schema:', auditSchema[0]?.sql)
    } else {
        console.log('audit_logs table NOT FOUND')
    }

  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
