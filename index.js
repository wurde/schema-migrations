"use strict"

/**
 * Dependencies
 */

const path = require("path")
const fs = require("fs")

/**
 * Define SchemaMigrations class
 */

class SchemaMigrations {
  constructor(base, db, config={}) {
    this.base = base
    this.db = db
    if (config.type === "sqlite") {
      this.type = "sqlite"
    } else {
      this.type = "postgresql"
    }
    this.close = config.close
    this.schema_migrations = []
    this.migration_file_versions = []
    this.migration_files = {}
    this.check_base_directory()
    this.check_db_interface()
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
    if (this.type === "postgresql") {
      if (this.db == undefined || this.db.query == undefined) {
        throw new Error("Incomplete db interface for postgresql.")
        return false
      }
    }

    if (this.type === "sqlite") {
      if (this.db == undefined || this.db.query == undefined || this.db.prepare == undefined) {
        throw new Error("Incomplete db interface for sqlite.")
        return false
      }
    }
  }

  /**
   * Run all pending migrations.
   *
   * @method
   * @return {Boolean} - did it succeed?
   * @public
   */

  async run() {
    await this.create_if_not_exists_schema_migrations()
    await this.collect_all_schema_migrations()
    await this.collect_all_migration_files()
    await this.run_pending_migrations()
    if (this.close) {
      this.db.end()
    }
    return true
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
  version text PRIMARY KEY
);

COMMIT;
      `)
    }
  }

  /**
   * Collect all schema_migrations in the database.
   *
   * @method
   * @public
   */

  async collect_all_schema_migrations() {
    if (this.type === "postgresql") {
      let result = await this.db.query("SELECT version FROM schema_migrations;")

      for (let i=0; i < result.rows.length; i++) {
        this.schema_migrations.push(result.rows[i].version)
      }
    }

    if (this.type === "sqlite") {
      let result = await this.db.prepare("SELECT version FROM schema_migrations;").all()

      for (let i=0; i < result.length; i++) {
        this.schema_migrations.push(result[i].version)
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
    let files = fs.readdirSync(path.join(this.base, "db", "migrations"))

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
    if (this.type === "postgresql") {
      for (let i=0; i < this.migration_file_versions.length; i++) {
        if (!this.schema_migrations.includes(this.migration_file_versions[i])) {
          let filename = this.migration_files[this.migration_file_versions[i]]
          let result = await require(path.join(this.base, "db", "migrations", filename))(this.db)

          if (result === false) { return false }
          await this.save_version_to_db(this.migration_file_versions[i])
        }
      }
    }

    if (this.type === "sqlite") {
      for (let i=0; i < this.migration_file_versions.length; i++) {
        if ((i + 1) > this.schema_migrations.length) {
          let filename = this.migration_files[this.migration_file_versions[i]]
          let result = await require(path.join(this.base, "db", "migrations", filename))(this.db)

          if (result === false) { return false }
          await this.save_version_to_db(this.migration_file_versions[i])
        }
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
    if (this.type === "postgresql") {
      await this.db.query("INSERT INTO schema_migrations (version) VALUES ($1::bigint);", [version])
    }

    if (this.type === "sqlite") {
      await this.db.query("INSERT INTO schema_migrations DEFAULT VALUES;")
    }
  }
}

/**
 * Export class
 */

module.exports = SchemaMigrations
