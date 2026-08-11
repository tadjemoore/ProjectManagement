import os
import sqlite3
import json
import uuid

# Configuration file for Database path (easy to redirect to NAS)
# need an easy way to change DB path for NAS and to DEV easily by changin one variable instaed of changing code in multiple places
CONFIG_FILE = "db_config.json"
# use /data/projects.db for NAS deployment, or projects.db for local deployment
DEFAULT_DB_PATH = "/data/projects.db"
# DEFAULT_DB_PATH = "projects.db"

def get_db_path():
    """Reads the database path from the configuration file, or returns the default."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                config = json.load(f)
                return config.get("db_path", DEFAULT_DB_PATH)
        except Exception as e:
            print(f"Error reading {CONFIG_FILE}: {e}. Using default: {DEFAULT_DB_PATH}")
    
    # Save default config if it doesn't exist
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump({"db_path": DEFAULT_DB_PATH, "_comment": "Change db_path to your NAS directory, e.g., 'Z:/shared/projects.db' or '//NAS/share/projects.db'"}, f, indent=4)
    except Exception as e:
        print(f"Error creating default {CONFIG_FILE}: {e}")
        
    return DEFAULT_DB_PATH

def get_connection():
    """Establishes connection to the SQLite database."""
    db_path = get_db_path()
    # Ensure directory exists if path contains directories
    dir_name = os.path.dirname(db_path)
    if dir_name and not os.path.exists(dir_name):
        try:
            os.makedirs(dir_name, exist_ok=True)
        except Exception as e:
            print(f"Failed to create database directory {dir_name}: {e}")
            
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row  # Access columns by name
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    return conn

def ensure_users_auth_columns(cursor):
    cursor.execute("PRAGMA table_info(users)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    if "username" not in existing_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN username TEXT")

    if "password_hash" not in existing_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")

    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)")


def ensure_roles_table(cursor):
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_signup_allowed INTEGER NOT NULL DEFAULT 1
    );
    """)

    cursor.execute("PRAGMA table_info(roles)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    if "is_signup_allowed" not in existing_columns:
        cursor.execute("ALTER TABLE roles ADD COLUMN is_signup_allowed INTEGER NOT NULL DEFAULT 1")

    cursor.execute("SELECT COUNT(*) FROM roles")
    if cursor.fetchone()[0] == 0:
        cursor.executemany(
            "INSERT INTO roles (id, name, is_active, is_signup_allowed) VALUES (?, ?, ?, ?)",
            [
                ("role-admin", "Admin", 1, 0),
                ("role-manager", "Manager", 1, 1),
                ("role-employee", "Employee", 1, 1)
            ]
        )

    cursor.execute("INSERT OR IGNORE INTO roles (id, name, is_active, is_signup_allowed) VALUES (?, ?, ?, ?)", ("role-admin", "Admin", 1, 0))
    cursor.execute("UPDATE roles SET is_active = 1 WHERE name IN ('Admin', 'Manager', 'Employee')")
    cursor.execute("UPDATE roles SET is_signup_allowed = 0 WHERE name = 'Admin'")
    cursor.execute("UPDATE roles SET is_signup_allowed = 1 WHERE name IN ('Manager', 'Employee')")

def ensure_audit_columns(cursor):
    # Ensure projects.created_at exists
    cursor.execute("PRAGMA table_info(projects)")
    project_cols = {row[1] for row in cursor.fetchall()}
    if "created_at" not in project_cols:
        cursor.execute("ALTER TABLE projects ADD COLUMN created_at TEXT")
        # Backfill existing rows so API responses always have a value
        cursor.execute("UPDATE projects SET created_at = datetime('now') WHERE created_at IS NULL")

    # Ensure projects.updated_at exists
    cursor.execute("PRAGMA table_info(projects)")
    project_cols = {row[1] for row in cursor.fetchall()}
    if "updated_at" not in project_cols:
        cursor.execute("ALTER TABLE projects ADD COLUMN updated_at TEXT")
        # Backfill existing rows so API responses always have a value
        cursor.execute("UPDATE projects SET updated_at = datetime('now') WHERE updated_at IS NULL")

    # Ensure tasks.created_at exists
    cursor.execute("PRAGMA table_info(tasks)")
    task_cols = {row[1] for row in cursor.fetchall()}
    if "created_at" not in task_cols:
        cursor.execute("ALTER TABLE tasks ADD COLUMN created_at TEXT")
        # Backfill existing rows so API responses always have a value
        cursor.execute("UPDATE tasks SET created_at = datetime('now') WHERE created_at IS NULL")

    # Ensure tasks.updated_at exists
    cursor.execute("PRAGMA table_info(tasks)")
    task_cols = {row[1] for row in cursor.fetchall()}
    if "updated_at" not in task_cols:
        cursor.execute("ALTER TABLE tasks ADD COLUMN updated_at TEXT")
        # Backfill existing rows so API responses always have a value
        cursor.execute("UPDATE tasks SET updated_at = datetime('now') WHERE updated_at IS NULL")

def ensure_attachment_columns(cursor):
    cursor.execute("PRAGMA table_info(attachments)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    if "attachment_type" not in existing_columns:
        cursor.execute("ALTER TABLE attachments ADD COLUMN attachment_type TEXT NOT NULL DEFAULT 'general'")

    # Binary payload storage in DB
    if "file_data" not in existing_columns:
        cursor.execute("ALTER TABLE attachments ADD COLUMN file_data BLOB")

    # Lookup index for list + replace checks
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_attachments_project_type_name 
        ON attachments(project_id, attachment_type, file_name);
    """)

def ensure_task_status_values(cursor):
    cursor.execute("UPDATE tasks SET status = 'not_started' WHERE status = 'pending'")
    cursor.execute("UPDATE tasks SET status = 'not_started' WHERE status IS NULL OR TRIM(status) = ''")
    cursor.execute("UPDATE tasks SET status = 'not_started' WHERE status NOT IN ('not_started', 'in_progress', 'on_hold', 'completed')")

def initialize_database():
    """Creates the schema tables and applies migrations if needed."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar TEXT,
        username TEXT UNIQUE,
        password_hash TEXT
    );
    """)

    # Projects table with foreign key to users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        status TEXT NOT NULL, -- 'not_started', 'in_progress', 'on_hold', 'completed'
        owner_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), -- timestamp of creation
        updated_at TEXT NOT NULL DEFAULT (datetime('now')), -- timestamp of last update
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE RESTRICT
    );
    """)

    # Create project_members table to manage many-to-many relationship between projects and users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_members (
        project_id TEXT,
        user_id TEXT,
        PRIMARY KEY(project_id, user_id),
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Create tasks table with foreign keys to projects and users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        assignee_id TEXT,
        priority TEXT NOT NULL, -- 'low', 'medium', 'high'
        due_date TEXT,
        status TEXT NOT NULL, -- 'not_started', 'in_progress', 'on_hold', 'completed'
        created_at TEXT NOT NULL DEFAULT (datetime('now')), -- timestamp of creation
        updated_at TEXT NOT NULL DEFAULT (datetime('now')), -- timestamp of last update
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL
    );
    """)
    # create attachments table wit foreign key to projects
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_date TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );
    """)


    ensure_users_auth_columns(cursor)
    ensure_roles_table(cursor)
    ensure_task_status_values(cursor)
    ensure_attachment_columns(cursor)
    ensure_audit_columns(cursor)
    
    conn.commit()

    conn.close()

if __name__ == "__main__":
    initialize_database()