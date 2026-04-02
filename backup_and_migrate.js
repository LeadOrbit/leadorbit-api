const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = path.join(__dirname, 'db_backups');
const DB_NAME = process.env.DB_NAME || 'email_automation';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const BACKUP_FILENAME = `${DB_NAME}_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;

const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
  }
};

const cleanupOldBackups = () => {
  const files = fs.readdirSync(BACKUP_DIR);
  files.forEach(file => fs.unlinkSync(path.join(BACKUP_DIR, file)));
};

const createBackup = () => {
  const backupPath = path.join(BACKUP_DIR, BACKUP_FILENAME);
  const dumpCommand = `pg_dump -U ${DB_USER} -h ${DB_HOST} -p ${DB_PORT} -F p -f "${backupPath}" ${DB_NAME}`;
  console.log(`⏳ Creating backup: ${backupPath}`);
  execSync(dumpCommand, { stdio: 'inherit', env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'admin' } });
  console.log('✅ Backup completed successfully');
};

const runMigrations = () => {
  console.log('🚀 Running Sequelize migrations...');
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
};

(async () => {
  try {
    ensureBackupDir();
    cleanupOldBackups();
    createBackup();
    runMigrations();
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
  }
})();
