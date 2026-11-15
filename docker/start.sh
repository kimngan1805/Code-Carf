#!/bin/sh
# Apply pending migrations, then start the app. Used as the container command.
set -e
prisma migrate deploy
exec node server.js
