
import { defineAbilityFor } from './lib/ability'

const userWithRole = {
  id: '1',
  role: 'test',
  permissions: [] // Empty permissions
}

const userAdmin = {
  id: '2',
  role: 'admin',
  permissions: []
}

const userGuest = undefined

console.log('--- Testing Ability ---')

const abilityUser = defineAbilityFor(userWithRole)
console.log('User (Role: test, Perms: []): can read DashboardStats?', abilityUser.can('read', 'DashboardStats'))
console.log('User Rules:', JSON.stringify(abilityUser.rules, null, 2))

const abilityAdmin = defineAbilityFor(userAdmin)
console.log('Admin: can read DashboardStats?', abilityAdmin.can('read', 'DashboardStats'))

const abilityGuest = defineAbilityFor(userGuest)
console.log('Guest: can read DashboardStats?', abilityGuest.can('read', 'DashboardStats'))

const userWithPerm = {
  id: '3',
  role: 'test',
  permissions: [{ action: 'read', subject: 'DashboardStats' }]
}

const abilityPerm = defineAbilityFor(userWithPerm)
console.log('User (Role: test, Perms: [read DashboardStats]): can read DashboardStats?', abilityPerm.can('read', 'DashboardStats'))
