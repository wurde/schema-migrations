# schema-migrations

Migrate database migrations.

## Getting started

Add the package to your project using the npm ecosystem:

```bash
$ npm install schema-migrations --save
```

Then use:

```javascript
const SchemaMigrations = require('schema-migrations')
const base = path.join(__dirname, '..', '..')
const db = path.join(base, 'config', 'db')

let schema_migrations = new SchemaMigrations(base, db)

schema_migrations.run()
  .catch((err) => {
    console.error(err)
  })
```

## Changelog

Get the project's history in [CHANGELOG.md](CHANGELOG.md).

## Maintainer

Andy Bettisworth <andy@accreu.com> https://andybettisworth.com

## License

This project is released under the [MIT License](LICENSE.txt).
