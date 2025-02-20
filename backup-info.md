# Backup Information

## Latest Backup
- Filename: circuit-platform-backup-20250219-004325.zip
- Date: February 19, 2025
- Location: Root directory of the project

## Backup Commands
To create a new backup:
```bash
zip -r circuit-platform-backup-$(date +%Y%m%d-%H%M%S).zip . -x "node_modules/*" ".git/*" "dist/*" "*.zip"
```

To restore from backup:
```bash
unzip circuit-platform-backup-20250219-004325.zip
```

## Backup Contents
The backup includes all project files except:
- node_modules (excluded to reduce size)
- .git directory
- dist directory
- Other zip files

## Important Notes
- After restoring, run `npm install` to reinstall dependencies
- The backup preserves all configuration files and source code
- Database content is not included in the backup
