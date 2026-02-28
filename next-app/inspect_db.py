import sqlite3
conn = sqlite3.connect('temp_migration.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(roles)")
print("Roles table columns:")
for col in cursor.fetchall():
    print(col)

print("\nPermissions table columns:")
cursor.execute("PRAGMA table_info(permissions)")
for col in cursor.fetchall():
    print(col)
conn.close()
