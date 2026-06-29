import dotenv from 'dotenv'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'

dotenv.config()

console.log('DATABASE_URL:', process.env.DATABASE_URL)
console.log('MEDIAHUB_DB_PATH:', process.env.MEDIAHUB_DB_PATH)

const envPath = resolve(__dirname, '../.env')
if (existsSync(envPath)) {
  console.log('.env file contents:')
  console.log(readFileSync(envPath, 'utf8'))
} else {
  console.log('.env file not found at:', envPath)
}
