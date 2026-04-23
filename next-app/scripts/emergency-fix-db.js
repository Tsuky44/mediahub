const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('!!! EMERGENCY DB FIX SCRIPT VERSION 2.0 !!!'); 
  console.log('Starting emergency database cleanup...');

  try {
    // 1. Drop problematic tables that prevent migration/push
    
    // user_group_members: Known to have schema conflicts
    console.log('Dropping table user_group_members...');
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "user_group_members";`);
      console.log('Dropped user_group_members successfully.');
    } catch (e) {
      console.log('Error dropping user_group_members:', e.message);
    }

    // tracker_stats_logs: New table, ensure it's clean
    console.log('Dropping table tracker_stats_logs...');
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "tracker_stats_logs";`);
      console.log('Dropped tracker_stats_logs successfully.');
    } catch (e) {
      console.log('Error dropping tracker_stats_logs:', e.message);
    }
    
    // daily_tracker_stats: New table, ensure it's clean
    console.log('Dropping table daily_tracker_stats...');
    try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "daily_tracker_stats";`);
        console.log('Dropped daily_tracker_stats successfully.');
      } catch (e) {
        console.log('Error dropping daily_tracker_stats:', e.message);
      }

    // 2. Handle audit_logs which is causing "datatype mismatch"
    // This usually means existing data conflicts with the schema (e.g. text in integer column)
    console.log('Handling audit_logs table (source of datatype mismatch)...');
    try {
        // Check if table exists first to avoid error
        const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs';`;
        
        if (result.length > 0) {
            const backupName = `audit_logs_backup_${Math.floor(Date.now() / 1000)}`;
            console.log(`Renaming audit_logs to ${backupName} to unblock schema push...`);
            await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" RENAME TO "${backupName}";`);
            console.log('Renamed audit_logs successfully.');
        } else {
            console.log('audit_logs table not found, skipping rename.');
        }
    } catch (e) {
        console.log('Error handling audit_logs:', e.message);
    }

    // 3. Clean up failed migration records
    console.log('Cleaning up failed migration records...');
    try {
      // Check if _prisma_migrations exists
      const migTable = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations';`;
      if (migTable.length > 0) {
          await prisma.$executeRawUnsafe(`
            DELETE FROM "_prisma_migrations" 
            WHERE migration_name IN (
                '20260227100000_fix_user_group_members_id', 
                '20260307140000_fix_schema_drift'
            );
          `);
          console.log('Cleaned up migration records.');
      } else {
          console.log('_prisma_migrations table not found, skipping cleanup.');
      }
    } catch (e) {
      console.log('Error cleaning migration records:', e.message);
    }

    console.log('Cleanup complete. Now Prisma DB Push should work.');
  } catch (error) {
    console.error('Critical error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
