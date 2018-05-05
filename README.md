# schema-migrations

Migrate database migrations.

## Getting started

Add the package to your project using the npm ecosystem:

```bash
$ npm install schema-migrations --save
```

Then use:

```javascript
"use strict"

module.exports = async (app) => {
  /**
   * Dependencies
   */

  const SchemaMigrations = require("schema-migrations")

  /**
   * Constants
   */

  const base = app.locals.base
  const db = app.locals.db

  /**
   * Configure schema migrations.
   */

  let config = {
    type: "postgresql",
    close: false
  }

  /**
   * Run any pending migrations.
   */

  let schema_migrations = new SchemaMigrations(base, db, config)

  try {
    await schema_migrations.run()
  } catch(err) {
    console.error(err)
  }

  return true
}
```

## Changelog

Get the project's history in [CHANGELOG.md](CHANGELOG.md).

## Maintainer

Andy Bettisworth <andy@accreu.com> https://andybettisworth.com

## License

This project is released under the [MIT License](LICENSE.txt).
