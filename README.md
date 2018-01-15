# schema-migrations

Migrate database migrations.

## Getting started

Add the package to your project using the npm ecosystem:

```bash
$ npm install schema-migrations --save
```

Then use within an Express app.

```javascript
'use strict'

/**
 * Dependencies
 */

const express = require('express')
const schema_migrations = require('schema-migrations')
const path = require('path')

/**
 * Initialize app
 */

const app = express()

/**
 * Constants
 */

const base = path.join(__dirname, '..')

/**
 * Locals
 */

app.locals.base = base
app.locals.db = require('./db')(app)

/**
 * Initializers
 */

schema_migrations(app.locals.base, app.locals.db)

...
```

## Changelog

Get the project's history in [CHANGELOG.md](CHANGELOG.md).

## Maintainer

Andy Bettisworth <andy@accreu.com> https://andybettisworth.com

## License

This project is released under the [MIT License](LICENSE.txt).
