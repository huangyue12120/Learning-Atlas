import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { RequestError } from "./security.ts";

const learnerTables = ["learning_state", "notes", "tutor_messages", "review_items", "quiz_attempts", "reader_drafts"];
type Snapshot = Array<{ table: string; rows: Record<string, any>[] }>;

export function createUndoStore(database: DatabaseSync, now = Date.now) {
  database.exec(`CREATE TABLE IF NOT EXISTS data_revision (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL) STRICT;
    INSERT OR IGNORE INTO data_revision VALUES (1, 0);
    CREATE TABLE IF NOT EXISTS undo_operations (token TEXT PRIMARY KEY, scope TEXT NOT NULL, snapshot TEXT NOT NULL, revision INTEGER NOT NULL, expires_at INTEGER NOT NULL) STRICT;`);
  for (const table of learnerTables) for (const action of ["INSERT", "UPDATE", "DELETE"]) {
    database.exec(`CREATE TRIGGER IF NOT EXISTS revision_${table}_${action} AFTER ${action} ON ${table}
      BEGIN UPDATE data_revision SET revision = revision + 1 WHERE id = 1; END;`);
  }
  const revision = () => Number((database.prepare("SELECT revision FROM data_revision WHERE id = 1").get() as any).revision);
  return {
    perform<T>(scope: string, selection: { table: string; lessonId?: string; id?: number }[], operation: () => T) {
      database.prepare("DELETE FROM undo_operations WHERE expires_at <= ?").run(now());
      database.exec("SAVEPOINT undo_write");
      try {
        const snapshot: Snapshot = selection.map(({ table, lessonId, id }) => {
          if (!learnerTables.includes(table)) throw new Error("无效的撤销范围。");
          const clauses = [...(lessonId ? ["lesson_id = ?"] : []), ...(id !== undefined ? ["id = ?"] : [])];
          const args = [...(lessonId ? [lessonId] : []), ...(id !== undefined ? [id] : [])];
          return { table, rows: database.prepare(`SELECT * FROM ${table}${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}`).all(...args) as any[] };
        });
        const result = operation();
        const token = randomUUID(), expiresAt = now() + 60_000;
        database.prepare("INSERT INTO undo_operations VALUES (?, ?, ?, ?, ?)").run(token, scope, JSON.stringify(snapshot), revision(), expiresAt);
        database.exec("RELEASE undo_write");
        return { result, undo: { token, scope, expiresAt } };
      } catch (error) { database.exec("ROLLBACK TO undo_write; RELEASE undo_write"); throw error; }
    },
    restore(token: string, scope: string) {
      const operation = database.prepare("SELECT * FROM undo_operations WHERE token = ?").get(token) as any;
      if (!operation || operation.scope !== scope) throw new RequestError(404, "撤销操作不存在或范围不匹配。");
      if (operation.expires_at <= now()) throw new RequestError(410, "撤销已超过 60 秒，请从备份恢复。");
      if (scope === "import" && operation.revision !== revision()) throw new RequestError(409, "导入后已有新的学习数据写入，不能撤销覆盖。");
      const snapshot: Snapshot = JSON.parse(operation.snapshot);
      database.exec("SAVEPOINT undo_restore");
      try {
        if (scope === "import") for (const table of learnerTables) database.exec(`DELETE FROM ${table}`);
        for (const { table, rows } of snapshot) {
          if (!learnerTables.includes(table)) throw new Error("无效的撤销范围。");
          for (const row of rows) {
            if (scope !== "import" && database.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(row.id)) throw new RequestError(409, "原记录位置已有新数据，不能撤销覆盖。");
            const columns = Object.keys(row);
            database.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).run(...Object.values(row));
          }
        }
        database.prepare("DELETE FROM undo_operations WHERE token = ?").run(token);
        database.exec("RELEASE undo_restore");
      } catch (error) { database.exec("ROLLBACK TO undo_restore; RELEASE undo_restore"); throw error; }
      return { restored: true };
    },
    allTables: learnerTables.map(table => ({ table }))
  };
}
