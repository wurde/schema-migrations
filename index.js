"use strict"

/**
 * Dependencies
 */

const path = require("path")
const fs = require("fs")

/**
 * Define SchemaMigrations class.
 */

class SchemaMigrations {
  constructor(base, db, type) {
    this.base = base
    this.db = db
    this.type = type

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
    return true
  }

  /**
   * Create table if not exists schema_migrations.
   *
   * @method
   * @public
   */

  async create_if_not_exists_schema_migrations() {
    await this.db.query(`
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version numeric PRIMARY KEY
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
    if (this.type === "postgresql") {
      let results = await this.db.query("SELECT version FROM schema_migrations ORDER BY version ASC;")

      for (let i=0; i < results.rows.length; i++) {
        this.schema_migrations.push(Number.parseInt(results.rows[i].version))
      }
    }

    if (this.type === "sqlite") {
      let results = await this.db.prepare("SELECT version FROM schema_migrations ORDER BY version ASC;").all()

      for (let i=0; i < results.length; i++) {
        this.schema_migrations.push(Number.parseInt(results[i].version))
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
    let migrations = []

    for (let i=0; i < files.length; i++) {
      if (/\d+/.test(files[i])) {
        let version = Number.parseInt(files[i].match(/\d+/)[0])
        migrations.push({ version: version, filename: files[i] })
      }
    }

    migrations.sort(function(a, b) { return a.version - b.version })

    for (let i=0; i < migrations.length; i++) {
      this.migration_file_versions.push(migrations[i].version)
      this.migration_files[migrations[i].version] = migrations[i].filename
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
        let result = await require(path.join(this.base, "db", "migrations", filename))(this.db)

        if (result === false) { return false }
        await this.save_version_to_db(this.migration_file_versions[i])
      }
    }
  }

  /**
   * Save version to database.
   *
   * @method
   * @param {Number} version - version to save to the db.
   * @public
   */

  async save_version_to_db(version) {
    if (this.type === "postgresql") {
      await this.db.query("INSERT INTO schema_migrations (version) VALUES ($1);", [version])
    }

    if (this.type === "sqlite") {
      await this.db.prepare("INSERT INTO schema_migrations (version) VALUES ($version)").run({ version: version })
    }
  }
}

/**
 * Export class
 */

module.exports = SchemaMigrations
