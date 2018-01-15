'use strict'

module.exports = async (base, db) => {
  /**
   * Dependencies
   */

  const path = require('path')
  const fs = require('fs')

  try {
    /**
     * Locals
     */

    let result
    let schema_migrations = []
    let migration_file_versions = []
    let migration_files = {}

    /**
     * Ensure schema_migrations is a table in the database
     */

    await db.query(`
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version bigint PRIMARY KEY
);

COMMIT;
    `)

    /**
     * Collect all schema_migrations in the database.
     */

    result = await db.query("SELECT version FROM schema_migrations;")
    if (result && result.rowCount) { // TEMP: enables mocking db for tests
      if (result.rowCount > 0) {
        for (let i=0; i < result.rowCount; i++) {
          schema_migrations.push(result.rows[i].version)
        }
      }

      /**
       * Collect all migration files.
       */

      let files = fs.readdirSync(path.join(base, '/db/migrations'))
      for (let i=0; i < files.length; i++) {
        if (/\d+/.test(files[i])) {
          migration_file_versions.push(files[i].match(/\d+/)[0])
          migration_files[files[i].match(/\d+/)[0]] = files[i]
        }
      }

      /**
       * Run pending migrations.
       */

      for (let i=0; i < migration_file_versions.length; i++) {
        if (!schema_migrations.includes(migration_file_versions[i])) {
          await require(path.join(base, '/db/migrations/', migration_files[migration_file_versions[i]]))(db)

          /**
           * Save version to database.
           */

          await db.query('INSERT INTO schema_migrations (version) VALUES ($1::bigint);', [migration_file_versions[i]])
        }
      }
    }
  } catch(err) {
    console.error(err)
  } finally {
    return true
  }
}
