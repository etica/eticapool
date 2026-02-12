#!/bin/bash

# Restore JSON-exported collections into a MongoDB database
#
# Usage:
#   bash scripts/restore-json-backup.sh /path/to/23june2024 [db-name]
#
# Example:
#   bash scripts/restore-json-backup.sh ~/eticapooldbsaves/23june2024
#   bash scripts/restore-json-backup.sh ~/eticapooldbsaves/23june2024 tokenpool_rebuild

BACKUP_DIR="${1:?Usage: bash $0 /path/to/backup-dir [db-name]}"
DB_NAME="${2:-tokenpool_rebuild}"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Directory not found: $BACKUP_DIR"
  exit 1
fi

echo "═══════════════════════════════════════════════════"
echo "  Restoring JSON backup into MongoDB"
echo "═══════════════════════════════════════════════════"
echo "  Source:    $BACKUP_DIR"
echo "  Target DB: $DB_NAME"
echo ""

for FILE in "$BACKUP_DIR"/*.json; do
  COLL=$(basename "$FILE" .json)
  echo "  Importing $COLL..."
  sudo mongoimport --db "$DB_NAME" --collection "$COLL" --file "$FILE" --drop
  echo ""
done

echo "═══════════════════════════════════════════════════"
echo "  Done!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Next step: find recovery start point"
echo "    node scripts/find-recovery-start.js --db-name $DB_NAME"
