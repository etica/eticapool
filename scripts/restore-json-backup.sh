#!/bin/bash

# Restore JSON-exported collections into a MongoDB database
#
# Usage:
#   ./scripts/restore-json-backup.sh /path/to/23june2024 [db-name] [mongodb-uri]
#
# Example:
#   ./scripts/restore-json-backup.sh /backups/23june2024
#   ./scripts/restore-json-backup.sh /backups/23june2024 tokenpool_rebuild
#   ./scripts/restore-json-backup.sh /backups/23june2024 tokenpool_rebuild "mongodb://user:pass@localhost:27017"

BACKUP_DIR="${1:?Usage: $0 /path/to/backup-dir [db-name] [mongodb-uri]}"
DB_NAME="${2:-tokenpool_rebuild}"
MONGO_URI="${3:-mongodb://localhost:27017}"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Directory not found: $BACKUP_DIR"
  exit 1
fi

JSON_FILES=$(ls "$BACKUP_DIR"/*.json 2>/dev/null | wc -l)
if [ "$JSON_FILES" -eq 0 ]; then
  echo "ERROR: No .json files found in $BACKUP_DIR"
  exit 1
fi

echo "═══════════════════════════════════════════════════"
echo "  Restoring JSON backup into MongoDB"
echo "═══════════════════════════════════════════════════"
echo "  Source:    $BACKUP_DIR ($JSON_FILES collections)"
echo "  Target DB: $DB_NAME"
echo "  MongoDB:   $MONGO_URI"
echo ""

TOTAL=0
ERRORS=0

for FILE in "$BACKUP_DIR"/*.json; do
  COLL=$(basename "$FILE" .json)
  printf "  Importing %-40s" "$COLL..."

  OUTPUT=$(mongoimport \
    --uri="$MONGO_URI" \
    --db="$DB_NAME" \
    --collection="$COLL" \
    --file="$FILE" \
    --drop \
    2>&1)

  if [ $? -eq 0 ]; then
    # Extract document count from mongoimport output
    COUNT=$(echo "$OUTPUT" | grep -oP '\d+ document' | grep -oP '\d+' | tail -1)
    echo " ${COUNT:-?} docs"
    TOTAL=$((TOTAL + ${COUNT:-0}))
  else
    echo " ERROR"
    echo "    $OUTPUT" | head -3
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Done. $((JSON_FILES - ERRORS)) collections imported, $ERRORS errors"
echo "  Total documents: ~$TOTAL"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Next step: find recovery start point"
echo "    node scripts/find-recovery-start.js --db-name $DB_NAME"
