use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
    pub path: PathBuf,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
            path: db_path,
        };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS "Environment" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "name" TEXT NOT NULL,
                "release" TEXT NOT NULL,
                "baseUrl" TEXT NOT NULL,
                "kind" TEXT NOT NULL,
                "logCreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "logUpdateAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "logDeleted" BOOLEAN NOT NULL DEFAULT 0,
                "logDeletedAt" DATETIME,
                "isFavorite" BOOLEAN NOT NULL DEFAULT 0,
                "favoritedAt" DATETIME
            );

            CREATE TABLE IF NOT EXISTS "EnvironmentAuthKeys" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "payload" TEXT NOT NULL,
                "hash" TEXT NOT NULL,
                "environmentId" INTEGER NOT NULL UNIQUE,
                CONSTRAINT "EnvironmentAuthKeys_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "UpdateSchedule" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "scrapeFrequency" TEXT NOT NULL,
                "pingFrequency" TEXT NOT NULL,
                "environmentId" INTEGER NOT NULL UNIQUE,
                CONSTRAINT "UpdateSchedule_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "HTTPResponse" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "environmentId" INTEGER NOT NULL,
                "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "endpoint" TEXT,
                "resourceType" TEXT,
                "statusCode" INTEGER NOT NULL,
                "statusMessage" TEXT,
                "responseTimeMs" INTEGER NOT NULL,
                CONSTRAINT "HTTPResponse_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "MonitorHistory" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "environmentId" INTEGER NOT NULL,
                "httpResponseId" INTEGER NOT NULL UNIQUE,
                "analytics" TEXT,
                "licenseServer" TEXT,
                "mailServer" TEXT,
                "solrServer" TEXT,
                "viewer" TEXT,
                "openOffice" TEXT,
                "realTime" TEXT,
                "MSOffice" TEXT,
                "rawDetails" TEXT,
                CONSTRAINT "MonitorHistory_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "MonitorHistory_httpResponseId_fkey" FOREIGN KEY ("httpResponseId") REFERENCES "HTTPResponse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "StatisticsHistory" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "environmentId" INTEGER NOT NULL,
                "httpResponseId" INTEGER NOT NULL UNIQUE,
                "dataSourceFluigDs" TEXT,
                "dataSourceFluigDsRo" TEXT,
                "dbName" TEXT,
                "dbVersion" TEXT,
                "dbDriverName" TEXT,
                "dbDriverVersion" TEXT,
                "connectedUsers" BIGINT,
                "memoryHeap" BIGINT,
                "nonMemoryHeap" BIGINT,
                "dbTraficRecieved" BIGINT,
                "dbTraficSent" BIGINT,
                "dbSize" BIGINT,
                "artifactsApps" TEXT,
                "artifactsCore" TEXT,
                "artifactsSystem" TEXT,
                "externalConverter" BOOLEAN,
                "runtimeStart" DATETIME,
                "runtimeUptime" BIGINT,
                "threadingCount" BIGINT,
                "threadingPeakCount" BIGINT,
                "threadingDaemonCount" BIGINT,
                "threadingTotalStarted" BIGINT,
                "detailedMemory" TEXT,
                "systemServerMemorySize" BIGINT,
                "systemServerMemoryFree" BIGINT,
                "systemServerHDSize" TEXT,
                "systemServerHDFree" TEXT,
                "systemServerCoreCount" INTEGER,
                "systemServerArch" TEXT,
                "systemTmpFolderSize" BIGINT,
                "systemLogFolderSize" BIGINT,
                "systemHeapMaxSize" BIGINT,
                "systemHeapSize" BIGINT,
                "systemUptime" BIGINT,
                CONSTRAINT "StatisticsHistory_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "StatisticsHistory_httpResponseId_fkey" FOREIGN KEY ("httpResponseId") REFERENCES "HTTPResponse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "AppSetting" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "settingId" TEXT NOT NULL UNIQUE,
                "value" TEXT NOT NULL,
                "group" TEXT
            );

            CREATE INDEX IF NOT EXISTS "HTTPResponse_env_resource_time_idx" ON "HTTPResponse"("environmentId", "resourceType", "timestamp" DESC);
            CREATE INDEX IF NOT EXISTS "HTTPResponse_env_time_idx" ON "HTTPResponse"("environmentId", "timestamp" DESC);
            CREATE INDEX IF NOT EXISTS "MonitorHistory_environmentId_id_idx" ON "MonitorHistory"("environmentId", "id" DESC);
            CREATE INDEX IF NOT EXISTS "StatisticsHistory_environmentId_id_idx" ON "StatisticsHistory"("environmentId", "id" DESC);
            "#,
        )?;

        Ok(())
    }
}
