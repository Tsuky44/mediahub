import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const url = 'https://emby.tsuky.ovh/'
  const key = 'MTcxNTE3NzI3NjUxMDNmNGExYzEzLTQzN2EtNDRkMy1hNTA4LTlmOTM5ODYxOWYzNw=='
  
  // Find default instance
  const instance = await prisma.instance.findFirst({
    where: { isDefault: true }
  })
  
  if (!instance) {
    console.error('No default instance found')
    process.exit(1)
  }
  
  console.log(`Updating settings for instance: ${instance.name} (ID: ${instance.id})`)
  
  const settings = [
    { key: 'jellyseerr_url', value: url },
    { key: 'jellyseerr_api_key', value: key }
  ]
  
  for (const s of settings) {
    const existing = await prisma.setting.findFirst({
      where: { key: s.key, instanceId: instance.id }
    })
    
    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: s.value }
      })
      console.log(`Updated setting: ${s.key}`)
    } else {
      await prisma.setting.create({
        data: { key: s.key, value: s.value, instanceId: instance.id }
      })
      console.log(`Created setting: ${s.key}`)
    }
  }
  
  console.log('Settings updated successfully')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
