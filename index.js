'use strict'

/**
 * Dependencies
 */

const path = require('path')
const fs = require('fs')

/**
 * Define SchemaMigrations class
 */

class SchemaMigrations {
  constructor(base=undefined, db=undefined) {
    this.base = base
    this.db = db
    this.schema_migrations = []
    this.migration_file_versions = []
    this.migration_files = {}
  }

  /**
   * Run all pending migrations.
   *
   * @method
   * @return {Boolean} - did it succeed?
   * @public
   */

  async run() {
    this.check_base_directory()
    this.check_db_interface()
    await this.create_if_not_exists_schema_migrations()
    await this.collect_all_schema_migrations()
    await this.collect_all_migration_files()
    await this.run_pending_migrations()
    this.db.end()
    return true
  }

  /**
   * Check that base directory exists.
   *
   * @method
   * @return {Boolean} - does it exist?
   * @public
   */

  check_base_directory() {
    if (this.base == undefined || !fs.existsSync(this.base)) {
      throw new Error(`Mising directory ${this.base}`)
      return false
    }
  }

  /**
   * Check that db interface exists.
   *
   * @method
   * @return {Boolean} - does it exist?
   * @public
   */

  check_db_interface() {
    if (this.db == undefined || this.db.query == undefined) {
      throw new Error('Mising db#query')
      return false
    }
  }

  /**
   * Create table if not exists schema_migrations.
   *
   * @method
   * @return {Boolean} - does it exist?
   * @public
   */

  async create_if_not_exists_schema_migrations() {
    await this.db.query(`
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version bigint PRIMARY KEY
);

COMMIT;
    `)
  }

  /**
   * Collect all schema_migrations in the database.
   *
   * @method
   * @public
   */

  async collect_all_schema_migrations() {
    let result = await this.db.query('SELECT version FROM schema_migrations;')

    if (result.rowCount > 0) {
      for (let i=0; i < result.rowCount; i++) {
        this.schema_migrations.push(result.rows[i].version)
      }
    }
  }

  /**
   * Collect all migration files.
   *
   * @method
   * @public
   */

  async collect_all_migration_files() {
    let files = fs.readdirSync(path.join(this.base, 'db', 'migrations'))

    for (let i=0; i < files.length; i++) {
      if (/\d+/.test(files[i])) {
        this.migration_file_versions.push(files[i].match(/\d+/)[0])
        this.migration_files[files[i].match(/\d+/)[0]] = files[i]
      }
    }
  }

  /**
   * Run pending migrations.
   *
   * @method
   * @public
   */

  async run_pending_migrations() {
    for (let i=0; i < this.migration_file_versions.length; i++) {
      if (!this.schema_migrations.includes(this.migration_file_versions[i])) {
        let filename = this.migration_files[this.migration_file_versions[i]]
        let result = await require(path.join(this.base, 'db', 'migrations', filename))(this.db)

        if (result === false) { return false }
        await this.save_version_to_db(this.migration_file_versions[i])
      }
    }
  }

  /**
   * Save version to database.
   *
   * @method
   * @param {String} version - version to save to the db.
   * @public
   */

  async save_version_to_db(version) {
    await this.db.query('INSERT INTO schema_migrations (version) VALUES ($1::bigint);', [version])
  }
}

/**
 * Export class
 */

module.exports = SchemaMigrations
