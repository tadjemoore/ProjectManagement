import os
import base64
import hashlib
import hmac
import json
import re
import uuid
from email.parser import BytesParser
from email.policy import default
import mimetypes
import urllib.parse
from http.server import SimpleHTTPRequestHandler, HTTPServer
import database
from datetime import datetime

PORT = 8000

# PBKDF2 parameters high iteration count for security
PBKDF2_ALGORITHM = 'sha256'
PBKDF2_ITERATIONS = 210000
PBKDF2_SALT_BYTES = 16
PBKDF2_DK_BYTES = 32

def hash_password(password):
    #random salt per password
    salt = os.urandom(PBKDF2_SALT_BYTES)

    # Derive secure key from password and salt
    dk = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode('utf-8'),
        salt,
        PBKDF2_ITERATIONS,
        dklen=PBKDF2_DK_BYTES
    )

    # STore as versioned string for future upgrades
    salt_b64 = base64.b64encode(salt).decode('ascii')
    dk_b64 = base64.b64encode(dk).decode('ascii')
    return f"pbkdf2${PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt_b64}${dk_b64}"

def verify_password(password, stored_hash):
    # handle missing values safefully
    if not stored_hash:
        return False
    
    # Backwards compatible parsing of stored hash
    # Remove after migrgation
    if not stored_hash.startswith("pbkdf2$"):
        # Legacy hash format, fallback to simple comparison
        return hmac.compare_digest(password, stored_hash)
    
    try:
        _, algorithm, iterations_str, salt_b64, dk_b64 = stored_hash.split('$', 4)
        iterations = int(iterations_str)
        salt = base64.b64decode(salt_b64.encode('ascii'))
        expected = base64.b64decode(dk_b64.encode('ascii'))
    except Exception:
        return False  # Invalid hash format
    
    actual = hashlib.pbkdf2_hmac(
        algorithm,
        password.encode('utf-8'),
        salt,
        iterations,
        dklen=len(expected)
    )
    return hmac.compare_digest(actual, expected)


class APIRouter:
    #TO-DO: add more helpers to simplify code
    ATTACHMENT_UPLOAD_DIR = os.path.join("assets", "uploads", "attachments")
    ALLOWED_ATTACHMENT_TYPES = {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
        ".png", ".jpg", ".jpeg", ".gif", ".webp",
        ".dwg", ".dxf", ".txt"
    }
    @staticmethod
    def _get_user_role(conn, user_id):
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return row['role'] if row else None
    
    @staticmethod
    def _is_admin_or_manager(conn, user_id):
        # Centralized role gate for destructive actions
        role = APIRouter._get_user_role(conn, user_id)
        return role in ['Admin', 'Manager']

    @staticmethod
    def _normalize_attachment_type(raw_type):
        value = (raw_type or "general").strip().lower()
        allowed = {"general", "quote", "po", "drawing", "document", "other"}
        return value if value in allowed else "general"

    @staticmethod
    def _sanitize_file_name(file_name):
        # Remove path tricks and limit to safe characters
        base_name = os.path.basename(file_name or "").strip()
        safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', base_name)
        return safe_name[:180] if safe_name else ""

    @staticmethod
    def _attachments_base_dir():
        return os.environ.get("ATTACHMENTS_BASE_DIR", "/data/project_attachments")

    @staticmethod
    def _project_index_path(project_id):
        base_dir = APIRouter._attachments_base_dir()
        project_dir = os.path.join(base_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        return os.path.join(base_dir, project_id, "attachments_index.json")

    @staticmethod
    def _load_project_index(project_id):
        index_path = APIRouter._project_index_path(project_id)
        if not os.path.exists(index_path):
            return {"projectId": project_id, "attachments": []}

        try:
            with open(index_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"projectId": project_id, "attachments": []}

    @staticmethod
    def _save_project_index(project_id, index_data):
        index_path = APIRouter._project_index_path(project_id)
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index_data,f,indent=2)

    @staticmethod
    def _attachments_library_root():
        # Users can browse existing NAS files to link
        return os.environ.get("ATTACHMENTS_LIBRARY_ROOT", APIRouter._attachments_base_dir())

    
    @staticmethod
    def get_users(conn):
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, role, avatar, username FROM users")
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_roles(conn):
        cursor = conn.cursor()
        database.ensure_roles_table(cursor)
        conn.commit()
        cursor.execute("""
            SELECT name
            FROM roles
            WHERE is_active = 1 AND is_signup_allowed = 1
            ORDER BY name ASC
        """)
        return [row[0] for row in cursor.fetchall()]

    @staticmethod
    def get_admin_roles(conn):
        cursor = conn.cursor()
        database.ensure_roles_table(cursor)
        conn.commit()
        cursor.execute("""
            SELECT name
            FROM roles
            WHERE is_active = 1
            ORDER BY name ASC
        """)
        return [row[0] for row in cursor.fetchall()]

    @staticmethod
    def get_projects(conn):
        cursor = conn.cursor()
        
        # Get projects with owner info
        cursor.execute("""
            SELECT p.id, p.title, p.description, p.due_date, p.status, p.owner_id, p.created_at, p.updated_at,
                   u.name as owner_name, u.role as owner_role, u.avatar as owner_avatar
            FROM projects p
            JOIN users u ON p.owner_id = u.id
        """)
        projects_rows = cursor.fetchall()
        
        # Get all project members
        cursor.execute("""
            SELECT project_id, user_id FROM project_members
        """)
        members_rows = cursor.fetchall()
        
        # Map members to projects
        project_members = {}
        for row in members_rows:
            proj_id = row['project_id']
            user_id = row['user_id']
            if proj_id not in project_members:
                project_members[proj_id] = []
            project_members[proj_id].append(user_id)
            
        projects = []
        for row in projects_rows:
            proj_id = row['id']
            projects.append({
                "id": proj_id,
                "title": row['title'],
                "description": row['description'],
                "dueDate": row['due_date'],
                "status": row['status'],
                "ownerId": row['owner_id'],
                "owner": {
                    "id": row['owner_id'],
                    "name": row['owner_name'],
                    "role": row['owner_role'],
                    "avatar": row['owner_avatar']
                },
                "memberIds": project_members.get(proj_id, []),
                "createdAt": row['created_at'],
                "updatedAt": row['updated_at'],
            })
        return projects

    @staticmethod
    def create_project(conn, data):
        cursor = conn.cursor()
        
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        due_date = (data.get("dueDate") or "").strip()
        status = (data.get("status") or "not_started").strip()
        owner_id = (data.get("ownerId") or "").strip()

        raw_members = data.get("memberIds", [])
        raw_tasks = data.get("initialTasks", [])

        if not title:
            return {"success": False, "status": 400, "error": "Project title is required."}
        if not owner_id:
            return {"success": False, "status": 400, "error": "Project owner is required."}
        
        cursor.execute("SELECT id FROM users WHERE id = ?", (owner_id,))
        if not cursor.fetchone():
            return {"success": False, "status": 400, "error": "Project owner does not exist."}
        
        if not isinstance(raw_members, list):
            return {"success": False, "status": 400, "error": "memberIds must be a list."}
        
        if raw_tasks is None:
            raw_tasks = []
        if not isinstance(raw_tasks, list):
            return {"success": False, "status": 400, "error": "initialTasks must be a list."}
        
        cleaned_members = []
        seen = set()

        for uid in raw_members + [owner_id]:  # Ensure owner is included
            uid = (uid).strip()
            if not uid or uid in seen:
                continue
            cursor.execute("SELECT id FROM users WHERE id = ?", (uid,))
            if cursor.fetchone():
                cleaned_members.append(uid)
                seen.add(uid)
        
        proj_id = "proj-" + str(database.uuid.uuid4())[:8]

        try:
            conn.execute("BEGIN")
            now = datetime.now().isoformat(timespec='seconds')

            # Create project
            cursor.execute("""
                INSERT INTO projects (id, title, description, due_date, status, owner_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                proj_id,
                title,
                description,
                due_date,
                status,
                owner_id,
                now,
                now
            ))

            # Create Project Members
            for user_id in cleaned_members:
                cursor.execute("""
                    INSERT INTO project_members (project_id, user_id)
                    VALUES (?, ?)
                """, (proj_id, user_id))

            # Create seed tasks in same transaction
            for task in raw_tasks:
                task_title = (task.get("title") or "").strip()
                if not task_title:
                    continue  # Skip tasks without a title
                task_description = (task.get("description") or "").strip()
                task_assignee_id = (task.get("assigneeId") or "").strip()
                task_priority = (task.get("priority") or "medium").strip()
                task_due_date = (task.get("dueDate") or "").strip()
                
                if task_priority not in ['low', 'medium', 'high']:
                    task_priority = 'medium'  # Default to medium if invalid

                if task_assignee_id and task_assignee_id not in cleaned_members:
                    task_assignee_id = None

                task_id = "task-" + str(database.uuid.uuid4())[:8]
                cursor.execute("""
                    INSERT INTO tasks (id, project_id, title, description, assignee_id, priority, due_date, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    task_id,
                    proj_id,
                    task_title,
                    task_description,
                    task_assignee_id,
                    task_priority,
                    task_due_date,
                    'pending',
                    now,
                    now
                ))

            conn.commit()

        except Exception:
            conn.rollback()
            raise

        return {"id": proj_id, "success": True}        

    @staticmethod
    def update_project(conn, proj_id, data):
        cursor = conn.cursor()
        
        # Check if project exists and fetch owner authorization
        cursor.execute("SELECT id, owner_id FROM projects WHERE id = ?", (proj_id,))
        project_row = cursor.fetchone()
        if not project_row:
            return None
        
        owner_id = project_row["owner_id"]
        
        #acting user required for ALL project edits
        acting_user_id = (data.get("actingUserId") or "").strip()
        if not acting_user_id:
            return {"success": False, "status": 400, "error": "actingUserId is required to update project."}
        
        cursor.execute("SELECT role FROM users WHERE id = ?", (acting_user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return {"success": False, "status": 400, "error": "actingUserId does not exist."}
        
        role = user_row['role']

        #employee can only edit their own projects, manager/admin can make edits to all projects
        can_edit_all = role in ['Admin', 'Manager']
        is_owner = acting_user_id == owner_id

        if not (can_edit_all or is_owner):
            return {"success": False, "status": 403, "error": "User does not have permission to update this project."}

        allowed_statuses = ['not_started', 'in_progress', 'on_hold', 'completed']
            
        # Update project fields if provided
        if "status" in data:
            requested_status = (data.get("status") or "").strip()
            if requested_status not in allowed_statuses:
                return {"success": False, "status": 400, "error": f"Invalid status '{requested_status}'."}
            
            #only manager or admin can put a project on hold
            if requested_status == 'on_hold' and role not in ['Admin', 'Manager']:
                return {"success": False, "status": 403, "error": "Only Admin or Manager can put a project on hold."}
                # acting_user_id = (data.get("actingUserId") or "").strip()
                # if not acting_user_id:
                #     return {"success": False, "status": 400, "error": "actingUserId is required to put project on hold."}
                
                # cursor.execute("SELECT role FROM users WHERE id = ?", (acting_user_id,))
                # user_row = cursor.fetchone()
                # if not user_row:
                #     return {"success": False, "status": 400, "error": "actingUserId does not exist."}
                
                # if user_row['role'] not in ['Admin', 'Manager']:
                #     return {"success": False, "status": 403, "error": "Only Admin or Manager can put a project on hold."}
                
            cursor.execute("UPDATE projects SET status = ? WHERE id = ?", (requested_status, proj_id))
        
        #title, description, date edits
        if "title" in data:
            title = (data.get("title") or "").strip()
            if not title:
                return {"success": False, "status": 400, "error": "Project title cannot be empty."}
            cursor.execute("UPDATE projects SET title = ?, description = ?, due_date = ? WHERE id = ?", 
                           (title, data.get("description", ""), data.get("dueDate", ""), proj_id))
            
        # Update members list if provided
        if "memberIds" in data:
            member_ids = data.get("memberIds", [])
            if not isinstance(member_ids, list):
                return {"success": False, "status": 400, "error": "memberIds must be a list."}
            # Delete existing members
            cursor.execute("DELETE FROM project_members WHERE project_id = ?", (proj_id,))
            # Re-insert
            for user_id in member_ids:
                cursor.execute("INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)", (proj_id, user_id))
            
            #owner must always be a member
            cursor.execute("INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)", (proj_id, owner_id))
                
        conn.commit()
        return {"id": proj_id, "success": True}

    @staticmethod
    def get_tasks(conn):
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.id, t.project_id, t.title, t.description, t.assignee_id, t.priority, t.due_date, t.status, t.created_at, t.updated_at,
                   u.name as assignee_name, u.role as assignee_role, u.avatar as assignee_avatar
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
        """)
        tasks = []
        for row in cursor.fetchall():
            tasks.append({
                "id": row['id'],
                "projectId": row['project_id'],
                "title": row['title'],
                "description": row['description'],
                "assigneeId": row['assignee_id'],
                "assignee": {
                    "id": row['assignee_id'],
                    "name": row['assignee_name'],
                    "role": row['assignee_role'],
                    "avatar": row['assignee_avatar']
                } if row['assignee_id'] else None,
                "priority": row['priority'],
                "dueDate": row['due_date'],
                "status": row['status'],
                "createdAt": row['created_at'],
                "updatedAt": row['updated_at']
            })
        return tasks

    @staticmethod
    def create_task(conn, data):
        cursor = conn.cursor()
        project_id = (data.get("projectId") or "").strip()
        acting_user_id = (data.get("actingUserId") or "").strip()
        task_id = "task-" + str(database.uuid.uuid4())[:8]
        now = datetime.now().isoformat(timespec='seconds')

        # validate requried task content
        if not project_id:
            return {"success": False, "status": 400, "error": "Project ID is required to create a task."}
        if not acting_user_id:
            return {"success": False, "status": 400, "error": "actingUserId is required to create a task."}
        
        # Fetch project owner for authorization check
        cursor.execute("SELECT owner_id FROM projects WHERE id = ?", (project_id,))
        project_row = cursor.fetchone()
        if not project_row:
            return {"success": False, "status": 404, "error": "Project not found."}
        project_owner_id = project_row['owner_id']

        # Fetch acting user role for authorization check
        cursor.execute("SELECT role FROM users WHERE id = ?", (acting_user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return {"success": False, "status": 404, "error": "actingUserId not found."}
        acting_user_role = user_row['role']

        # Admin/Manager can manage all projects, employees can only manage their own projects
        can_manage = acting_user_role in ['Admin', 'Manager'] or acting_user_id == project_owner_id
        if not can_manage:
            return {"success": False, "status": 403, "error": "User does not have permission to create tasks for this project."}
        
        cursor.execute("""
            INSERT INTO tasks (id, project_id, title, description, assignee_id, priority, due_date, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task_id,
            data.get("projectId"),
            data.get("title", "Untitled Task"),
            data.get("description", ""),
            data.get("assigneeId"),
            data.get("priority", "medium"),
            data.get("dueDate", ""),
            data.get("status", "pending"),
            now,
            now
        ))

        # Recalculate project status after task creation
        APIRouter.recalculate_project_status(conn, project_id)

        conn.commit()
        return {"id": task_id, "success": True}
    
    @staticmethod
    def recalculate_project_status(conn, project_id):
        cursor = conn.cursor()

        #read current proj status
        cursor.execute("SELECT status FROM projects WHERE id = ?", (project_id,))
        project_row = cursor.fetchone()
        if not project_row:
            return None  # Project not found
        
        current_status = project_row['status']
        #if manager put project on hold, do not auto override it
        if current_status == 'on_hold':
            return
        
        #count tasks totals and completions
        cursor.execute("""
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks
            WHERE project_id = ?
        """, (project_id,))
        row = cursor.fetchone()
        total_tasks = row['total_tasks'] or 0
        completed_tasks = row['completed_tasks'] or 0

        # auto-calculate project status based on task completion
        if total_tasks == 0:
            new_status = 'not_started'
        elif completed_tasks == total_tasks:
            new_status = 'completed'
        elif completed_tasks > 0:
            new_status = 'in_progress'
        else:
            new_status = 'not_started'

        if new_status != current_status:
            cursor.execute("UPDATE projects SET status = ? WHERE id = ?", (new_status, project_id))
        
    @staticmethod
    def update_task(conn, task_id, data):
        cursor = conn.cursor()
        # Find task and parent project 
        cursor.execute("SELECT id, project_id FROM tasks WHERE id = ?", (task_id,))
        task_row = cursor.fetchone()
        if not task_row:
            return None
        
        project_id = task_row['project_id']
        acting_user_id = (data.get("actingUserId") or "").strip()

        if not acting_user_id:
            return {"success": False, "status": 400, "error": "actingUserId is required to update a task."}
        
        # Fetch project owner for authorization check
        cursor.execute("SELECT owner_id FROM projects WHERE id = ?", (project_id,))
        project_row = cursor.fetchone()
        if not project_row:
            return {"success": False, "status": 404, "error": "Project not found."}
        
        owner = project_row['owner_id']

        # Fetch acting user role
        cursor.execute("SELECT role FROM users WHERE id = ?", (acting_user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return {"success": False, "status": 404, "error": "actingUserId not found."}
        
        role = user_row['role']
        can_manage = role in ['Admin', 'Manager'] or acting_user_id == owner
        if not can_manage:
            return {"success": False, "status": 403, "error": "User does not have permission to update tasks for this project."}
    
        # Dynamically build update query based on fields provided
        update_fields = []
        params = []
        
        for field in ["status", "assignee_id", "priority", "title", "description", "due_date"]:
            db_field = field
            # map camelCase to snake_case if necessary
            if field == "assignee_id":
                data_key = "assigneeId"
            elif field == "due_date":
                data_key = "dueDate"
            else:
                data_key = field
                
            if data_key in data:
                update_fields.append(f"{db_field} = ?")
                params.append(data[data_key])
        
        # No-op update is still a successfuel authorization request
        if not update_fields:
            return {"id": task_id, "success": True}
        
        params.append(task_id)
        query = f"UPDATE tasks SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(query, params)

        # Keep project status in sync with task updates
        APIRouter.recalculate_project_status(conn, project_id)
        conn.commit()
        return {"id": task_id, "success": True}
    
    @staticmethod
    def delete_project(conn, project_id, acting_user_id):
        cursor = conn.cursor()

        acting_user_id = (acting_user_id or "").strip()
        if not acting_user_id:
            return {"success": False, "status": 400, "error": "actingUserId is required to delete a project."}
        
        # Only Admin/Manager can delete projects
        if not APIRouter._is_admin_or_manager(conn, acting_user_id):
            return {"success": False, "status": 403, "error": "Only Admins or Managers have permission to delete projects."}
        
        cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            return {"success": False, "status": 404, "error": "Project not found."}
        
        # Tasks and project_members cascade-delete throgh FK 
        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        return {"id": project_id, "success": True}

    @staticmethod
    def delete_task(conn, task_id, acting_user_id):
        cursor = conn.cursor()

        # Validate acting user identity for authorization
        acting_user_id = (acting_user_id or "").strip()
        if not acting_user_id:
            return {"success": False, "status": 400, "error": "actingUserId is required to delete a task."}
        
        # Load task and parent project for authorization check
        cursor.execute("SELECT project_id FROM tasks WHERE id = ?", (task_id,))
        task_row = cursor.fetchone()
        if not task_row:
            return {"success": False, "status": 404, "error": "Task not found."}
        
        project_id = task_row['project_id']

        # Fetch project owner
        cursor.execute("SELECT owner_id FROM projects WHERE id = ?", (project_id,))
        project_row = cursor.fetchone()
        if not project_row:
            return {"success": False, "status": 404, "error": "Project not found."}
        
        owner_id = project_row['owner_id']

        # Fetch acting user role
        cursor.execute("SELECT role FROM users WHERE id = ?", (acting_user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return {"success": False, "status": 404, "error": "actingUserId not found."}
        
        role = user_row['role']
        can_manage = role in ['Admin', 'Manager'] or acting_user_id == owner_id
        if not can_manage:
            return {"success": False, "status": 403, "error": "User does not have permission to delete tasks for this project."}
        
        cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))

        # Recalculate project status after task deletion
        APIRouter.recalculate_project_status(conn, project_id)

        conn.commit()
        return {"id": task_id, "success": True}

    @staticmethod
    def _fetch_user_row_by_username(conn, username):
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, role, avatar, username, password_hash
            FROM users
            WHERE username = ?
        """, (username,))
        row = cursor.fetchone()
        return row
    
    @staticmethod
    def login_user(conn, username, password):
        row = APIRouter._fetch_user_row_by_username(conn, username)
        
        if not row:
            return None

        stored_password_hash = row["password_hash"] or ""

        # verify password using PBKDF2 or fallback to legacy comparison
        if not verify_password(password, stored_password_hash):
            return None
        
        # if still in plain text, upgrade to PBKDF2 hash for future logins
        if stored_password_hash and not stored_password_hash.startswith("pbkdf2$"):
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(password), row["id"]))
            conn.commit()

        return {
            "id": row["id"],
            "name": row["name"],
            "role": row["role"],
            "avatar": row["avatar"],
            "username": row["username"]
        }
    
    @staticmethod
    def get_user_by_username(conn, username):
        row = APIRouter._fetch_user_row_by_username(conn, username)
        if not row:
            return None

        return {
            "id": row["id"],
            "name": row["name"],
            "role": row["role"],
            "avatar": row["avatar"],
            "username": row["username"]
        }
    
    @staticmethod
    def create_user(conn, data):
        cursor = conn.cursor()
        name = (data.get("name") or "").strip()
        username = (data.get("username") or "").strip().lower()
        role = (data.get("role") or "").strip()
        password = (data.get("password") or "").strip()

        if not name or not username or not role or not password:
            return None

        existing_user = APIRouter._fetch_user_row_by_username(conn, username)
        if existing_user:
            return "duplicate"

        user_id = "user-" + str(database.uuid.uuid4())[:8]
        avatar = "".join(part[0] for part in name.split() if part)[:2].upper()
        
        password_hash = hash_password(password)

        cursor.execute("""
            INSERT INTO users (id, name, role, avatar, username, password_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            name,
            role,
            avatar,
            username,
            password_hash
        ))
        conn.commit()
        return {
            "id": user_id,
            "name": name,
            "role": role,
            "avatar": avatar,
            "username": username
        }

    @staticmethod
    def update_user_role(conn, user_id, role):
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            return None

        cursor.execute("SELECT name FROM roles WHERE name = ? AND is_active = 1", (role,))
        if not cursor.fetchone():
            return "invalid-role"

        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
        conn.commit()
        return {"id": user_id, "role": role, "success": True}
    
    @staticmethod
    def create_attachment(conn, project_id, acting_user_id, attachment_type, original_name, file_bytes, mime_type=None, storage_subpath=""):
        project_id = (project_id or "").strip()
        acting_user_id = (acting_user_id or "").strip()
        attachment_type = APIRouter._normalize_attachment_type(attachment_type)
        original_name = APIRouter._sanitize_file_name(original_name)
        storage_subpath = (storage_subpath or "").strip()

        if not project_id:
            return {"success": False, "status": 400, "error": "projectId is required."}
        if not acting_user_id:
            return {"success": False, "status": 400, "error": "actingUserId is required."}
        if not original_name:
            return {"success": False, "status": 400, "error": "Invalid file name."}
        if not file_bytes:
            return {"success": False, "status": 400, "error": "File content is required."}

        ext = os.path.splitext(original_name)[1].lower()
        if ext not in APIRouter.ALLOWED_ATTACHMENT_TYPES:
            return {"success": False, "status": 400, "error": f"File type '{ext}' is not allowed."}

        cursor = conn.cursor()
        cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            return {"success": False, "status": 404, "error": "Project not found."}

        if APIRouter._is_admin_or_manager(conn, acting_user_id):
            can_manage = True
        else:
            cursor.execute("SELECT owner_id FROM projects WHERE id = ?", (project_id,))
            owner_row = cursor.fetchone()
            can_manage = bool(owner_row) and owner_row['owner_id'] == acting_user_id

        if not can_manage:
            return {"success": False, "status": 403, "error": "User does not have permission to upload attachments for this project."}

        final_mime = mime_type or mimetypes.guess_type(original_name)[0] or "application/octet-stream"
        now_ts = datetime.now().isoformat(timespec="seconds")

        # Same-name auto-replace: same project + same type + same file name will overwrite the existing attachment
        cursor.execute("""
            SELECT id
            FROM attachments
            WHERE project_id = ? AND attachment_type = ? AND file_name = ?
            ORDER BY uploaded_date DESC, id DESC
            LIMIT 1
        """, (project_id, attachment_type, original_name))

        existing = cursor.fetchone()

        if existing:
            attachment_id = existing['id']
            cursor.execute("""
                UPDATE attachments
                SET stored_name =?,
                    file_path = ?,
                    file_size = ?,
                    mime_type = ?,
                    uploaded_by = ?,
                    uploaded_date = ?,
                    file_data = ?
                WHERE id = ?
            """, (
                original_name,
                "db://attachments/data",
                len(file_bytes),
                final_mime,
                acting_user_id,
                now_ts,
                file_bytes,
                attachment_id
            ))
            conn.commit()
            return {"success": True, "id": attachment_id, "message": "Attachment updated."}

        cursor.execute("""
            INSERT INTO attachments (
            project_id, 
            file_name, 
            stored_name, 
            file_path, 
            file_size, 
            mime_type, 
            uploaded_by, 
            uploaded_date, 
            attachment_type, 
            file_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            project_id,
            original_name,
            original_name,
            "db://attachments/data",
            len(file_bytes),
            final_mime,
            acting_user_id,
            now_ts,
            attachment_type,
            file_bytes
        ))

        conn.commit()
        return {"success": True, "id": cursor.lastrowid, "message": "Attachment created."}        

    @staticmethod
    def get_attachments(conn, project_id, attachment_type="all"):
        project_id = (project_id or "").strip()
        if not project_id:
            return {"success": False, "status": 400, "error": "projectId is required."}

        normalized = (attachment_type or "all").strip().lower()
        cursor = conn.cursor()

        if normalized != "all":
            normalized = APIRouter._normalize_attachment_type(normalized)
            cursor.execute("""
                SELECT id, project_id, attachment_type, file_name, stored_name, file_size, mime_type, uploaded_by, uploaded_date
                FROM attachments
                WHERE project_id = ? AND attachment_type = ?
                ORDER BY uploaded_date DESC, id DESC
            """, (project_id, normalized))

        else:
            cursor.execute("""
                SELECT id, project_id, attachment_type, file_name, stored_name, file_size, mime_type, uploaded_by, uploaded_date
                FROM attachments
                WHERE project_id = ?
                ORDER BY uploaded_date DESC, id DESC
            """, (project_id,))

        rows = [dict(r) for r in cursor.fetchall()]

        user_ids = list({r.get("uploaded_by") for r in rows if r.get("uploaded_by")})
        users_map = {}
        if user_ids:
            placeholders = ",".join("?" for _ in user_ids)
            cursor.execute(f"SELECT id, name FROM users WHERE id IN ({placeholders})", tuple(user_ids))
            for u in cursor.fetchall():
                users_map[u["id"]] = u["name"]

        for r in rows:
            r["uploaded_by_name"] = users_map.get(r.get("uploaded_by"), "Unknown")

        # Newest first
        rows.sort(key=lambda x: x.get("uploaded_date", ""), reverse=True)
        return rows

    @staticmethod
    def list_nas_entries(relative_path=""):
        root = os.path.abspath(APIRouter._attachments_base_dir())
        rel = (relative_path or "").replace("\\", "/").lstrip("/").strip()

        # Prevent path traversal outside the base directory
        target_dir = os.path.abspath(os.path.join(root, rel))

        # Prevent path traversal outside the base directory
        if not target_dir.startswith(root):
            return {"success": False, "status": 400, "error": "Invalid path."}

        if not os.path.exists(target_dir) or not os.path.isdir(target_dir):
            return {"success": False, "status": 404, "error": "Directory not found."}

        entries = []
        for entry in sorted(os.listdir(target_dir), key=lambda s: s.lower()):
            abs_entry_path = os.path.join(target_dir, entry)
            rel_child = os.path.relpath(abs_entry_path, root).replace("\\", "/")
            entries.append({
                "name": entry,
                "relative_path": rel_child,
                "is_directory": os.path.isdir(abs_entry_path),
                "size": 0 if os.path.isdir(abs_entry_path) else os.path.getsize(abs_entry_path),
            })

        parent =""
        if rel:
            parent = os.path.dirname(rel).replace("\\", "/")

        return {"success": True, "root": root, "currentPath": rel, "parentPath": parent, "entries": entries}

    @staticmethod
    def get_attachment_by_id(conn, project_id, attachment_id):
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, project_id, attachment_type, file_name, stored_name, file_size, mime_type, uploaded_by, uploaded_date, file_data
            FROM attachments
            WHERE project_id = ? AND id = ?
            LIMIT 1
        """, (project_id, attachment_id))
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def link_existing_attachment(conn, project_id, acting_user_id, attachment_type, nas_relative_path):
        project_id = (project_id or "").strip()
        acting_user_id = (acting_user_id or "").strip()
        attachment_type = APIRouter._normalize_attachment_type(attachment_type)
        nas_relative_path = (nas_relative_path or "").replace("\\", "/").lstrip("/")

        if not project_id:
            return {"success": False, "status": 400, "error": "projectId is required."}
        if not acting_user_id:
            return {"success": False, "status": 400, "error": "actingUserId is required."}
        if not nas_relative_path:
            return {"success": False, "status": 400, "error": "Invalid NAS relative path."}

        cursor = conn.cursor()
        cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
        if not cursor.fetchone():
            return {"success": False, "status": 404, "error": "Project not found."}

        if APIRouter._is_admin_or_manager(conn, acting_user_id):
            can_manage = True
        else:
           cursor.execute("SELECT owner_id FROM projects WHERE id = ?", (project_id,))
           owner_row = cursor.fetchone()
           can_manage = bool(owner_row) and owner_row['owner_id'] == acting_user_id
        if not can_manage:
           return {"success": False, "status": 403, "error": "User does not have permission to link attachments for this project."}

        root = os.path.abspath(APIRouter._attachments_base_dir())
        abs_path = os.path.abspath(os.path.join(root, nas_relative_path))

        if not abs_path.startswith(root):
            return {"success": False, "status": 400, "error": "Invalid NAS relative path."}
        if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
            return {"success": False, "status": 404, "error": "File not found on NAS."}

        original_name = APIRouter._sanitize_file_name(os.path.basename(abs_path))
        ext = os.path.splitext(original_name)[1].lower()
        if ext not in APIRouter.ALLOWED_ATTACHMENT_TYPES:
            return {"success": False, "status": 400, "error": f"File type '{ext}' is not allowed."}

        mime_type = mimetypes.guess_type(original_name)[0] or "application/octet-stream"
        
        index_data = APIRouter._load_project_index(project_id)
        attachment_id = uuid.uuid4().hex[:20]

        index_data["attachments"].append({
            "id": attachment_id,
            "project_id": project_id,
            "attachment_type": attachment_type,
            "file_name": original_name,
            "stored_name": os.path.basename(abs_path),
            "file_path": os.path.abspath(abs_path),  # Physical NAS path
            "file_size": os.path.getsize(abs_path),
            "mime_type": mime_type,
            "uploaded_by": acting_user_id,
            "uploaded_date": datetime.now().isoformat(timespec="seconds"),
            "storage_subpath": os.path.dirname(nas_relative_path).replace("\\", "/")
        })
        APIRouter._save_project_index(project_id, index_data)
        return {"success": True, "id": attachment_id}

    @staticmethod
    def delete_attachment(conn, attachment_id, project_id, acting_user_id):
        project_id = (project_id or "").strip()
        acting_user_id = (acting_user_id or "").strip()

        if not project_id:
            return {"success": False, "status": 400, "error": "projectId is required."}
        if not acting_user_id:
            return {"success": False, "status": 400, "error": "actingUserId is required."}

        if APIRouter._is_admin_or_manager(conn, acting_user_id):
            can_manage = True
        else:
            cursor = conn.cursor()
            cursor.execute("SELECT owner_id FROM projects WHERE id = ?", (project_id,))
            owner_row = cursor.fetchone()
            can_manage = bool(owner_row) and owner_row['owner_id'] == acting_user_id
        if not can_manage:
            return {"success": False, "status": 403, "error": "User does not have permission to delete attachments for this project."}

        cursor = conn.cursor()
        cursor.execute("DELETE FROM attachments WHERE id = ? AND project_id = ?", (attachment_id, project_id))
        conn.commit()

        if cursor.rowcount == 0:
            return {"success": False, "status": 404, "error": "Attachment not found."}
        
        return {"success": True, "id": attachment_id}


class ProjectManagerHTTPHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for development/networking options
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path.startswith("/api/"):
            if self.path == "/api/login":
                self.handle_login()
            elif self.path == "/api/signup":
                self.handle_signup()
            elif self.path == "/api/attachments/upload":
                self.handle_attachment_upload()
            else:
                self.handle_api_post()
        else:
            self.send_error(404, "Not Found")

    def do_GET(self):
        # API Routes
        if self.path.startswith("/api/"):
            self.handle_api_get()
        else:
            # Fallback to serving static files
            super().do_GET()

    def handle_login(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')

        try:
            data = json.loads(post_data)
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON"})
            return
        
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()

        conn = database.get_connection()
        try:
            user = APIRouter.login_user(conn, username, password)
            if user:
                self.send_json_response(200, {"success": True, "user": user})
            else:
                self.send_json_response(401, {"error": "Invalid username or password"})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
        finally:
            conn.close()

    def handle_signup(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')

        try:
            data = json.loads(post_data)
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON"})
            return

        conn = database.get_connection()
        try:
            result = APIRouter.create_user(conn, data)

            if result == "duplicate":
                self.send_json_response(409, {"error": "Username already exists"})
            elif result is None:
                self.send_json_response(400, {"error": "Name, username, and password are required"})
            else:
                self.send_json_response(201, {"success": True, "user": result})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
        finally:
            conn.close()
            
    def do_PUT(self):
        if self.path.startswith("/api/"):
            self.handle_api_put()
        else:
            self.send_error(404, "Not Found")

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            self.handle_api_delete()
        else:
            self.send_error(404, "Not Found")

    def _parse_multipart_form_data(self, body_bytes, content_type):
            # Parse multipart/form-data without deprecated cgi module.
            raw = (
                f"Content-Type: {content_type}\r\n"
                "MIME-Version: 1.0\r\n\r\n"
            ).encode("utf-8") + body_bytes

            msg = BytesParser(policy=default).parsebytes(raw)

            fields = {}
            files = {}

            if not msg.is_multipart():
                return fields, files

            for part in msg.iter_parts():
                cd_params = dict(part.get_params(header="content-disposition", unquote=True) or [])
                field_name = cd_params.get("name")
                filename = cd_params.get("filename")

                if not field_name:
                    continue

                payload = part.get_payload(decode=True) or b""

                if filename:
                    files[field_name] = {
                        "filename": filename,
                        "content_type": part.get_content_type(),
                        "content": payload
                    }
                else:
                    fields[field_name] = payload.decode("utf-8", errors="replace")

            return fields, files
            
    def handle_attachment_upload(self):
        conn = database.get_connection()
        try:
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                self.send_json_response(400, {"error": "Content-Type must be multipart/form-data"})
                return

            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)

            fields, files = self._parse_multipart_form_data(body_bytes, content_type)

            project_id = (fields.get("projectId") or "").strip()
            acting_user_id = (fields.get("actingUserId") or "").strip()
            attachment_type = (fields.get("attachmentType") or "general").strip()
            storage_subpath = (fields.get("storageSubpath") or "").strip()

            file_obj = files.get("file")
            if not file_obj:
                self.send_json_response(400, {"error": "Missing file field."})
                return

            original_name = file_obj.get("filename") or ""
            mime_type = file_obj.get("content_type") or None
            file_bytes = file_obj.get("content") or b""

            print("[ATTACH UPLOAD] fields:", fields)
            print("[ATTACH UPLOAD] project_id:", project_id)
            print("[ATTACH UPLOAD] acting_user_id:", acting_user_id)
            print("[ATTACH UPLOAD] attachment_type:", attachment_type)
            print("[ATTACH UPLOAD] storage_subpath:", storage_subpath)
            print("[ATTACH UPLOAD] has_file:", bool(file_bytes))

            result = APIRouter.create_attachment(
                conn=conn,
                project_id=project_id,
                acting_user_id=acting_user_id,
                attachment_type=attachment_type,
                original_name=original_name,
                file_bytes=file_bytes,
                mime_type=mime_type,
                storage_subpath=storage_subpath
            )

            if isinstance(result, dict) and result.get("success") is False:
                self.send_json_response(result.get("status", 400), {"error": result.get("error", "Upload failed.")})
                return

            self.send_json_response(201, result)

        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
        finally:
            conn.close()

    def handle_attachment_download(self, conn, attachment_id, project_id, as_download=False):
        attachment = APIRouter.get_attachment_by_id(conn, project_id, attachment_id)
        if not attachment:
            self.send_json_response(404, {"error": "Attachment not found."})
            return

        file_data = attachment.get("file_data")
        if file_data is None:
            self.send_json_response(404, {"error": "Attachment file missing."})
            return

        file_name = attachment.get("file_name", "download.bin")
        mime_type = attachment.get("mime_type", "application/octet-stream")

        try:
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            disposition = "attachment" if as_download else "inline"
            self.send_header("Content-Disposition", f'{disposition}; filename="{file_name}"')
            self.send_header("Content-Length", str(len(file_data)))
            self.end_headers()
            self.wfile.write(file_data)
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})

    # API Request Handlers
    def handle_api_get(self):
        conn = database.get_connection()
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            query = urllib.parse.parse_qs(parsed.query)

            download_match = re.match(r"^/api/attachments/([^/]+)/download$", path)
            if download_match:
                project_id = (query.get("projectId", ["0"])[0] or "").strip()

                if not project_id:
                    self.send_json_response(400, {"error": "projectId query parameter is required for attachment download."})
                    return
                as_download = (query.get("download", ["0"])[0] == "1")
                self.handle_attachment_download(conn, download_match.group(1), project_id, as_download=as_download)
                return
            
            if path == "/api/users":
                data = APIRouter.get_users(conn)
                self.send_json_response(200, data)
            elif path == "/api/roles":
                data = APIRouter.get_roles(conn)
                self.send_json_response(200, data)
            elif path == "/api/admin/roles":
                data = APIRouter.get_admin_roles(conn)
                self.send_json_response(200, data)
            elif path == "/api/projects":
                data = APIRouter.get_projects(conn)
                self.send_json_response(200, data)
            elif path == "/api/tasks":
                data = APIRouter.get_tasks(conn)
                self.send_json_response(200, data)
            elif path == "/api/attachments/nas-browse":
                rel = (query.get("relativePath", [""])[0] or "").strip()
                data = APIRouter.list_nas_entries(rel)
                if isinstance(data, dict) and data.get("success") is False:
                    self.send_json_response(data.get("status", 400), {"error": data.get("error", "Invalid request")})
                else:
                    self.send_json_response(200, data)
            elif path == "/api/attachments":
                project_id = (query.get("projectId", [""])[0] or "").strip()
                attachment_type = (query.get("attachmentType", ["all"])[0] or "all").strip()
                data = APIRouter.get_attachments(conn, project_id, attachment_type)

                if isinstance(data, dict) and data.get("success") is False:
                    self.send_json_response(data.get("status", 400), {"error": data.get("error", "Invalid request")})
                    return
                else:
                    self.send_json_response(200, data)
            else:
                self.send_json_response(404, {"error": "Not Found"})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
        finally:
            conn.close()

    def handle_api_post(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(post_data)
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON"})
            return

        conn = database.get_connection()
        try:
            if self.path == "/api/projects":
                result = APIRouter.create_project(conn, data)
                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid project payload")})
                    return
                self.send_json_response(201, result)

            elif self.path == "/api/tasks":
                result = APIRouter.create_task(conn, data)

                # Surface business/authorization errors cleanly
                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid task payload")})
                    return
                
                self.send_json_response(201, result)

            elif self.path == "/api/attachments/link":
                result = APIRouter.link_existing_attachment(
                    conn, 
                    project_id=data.get("projectId"),
                    acting_user_id=data.get("actingUserId"),
                    attachment_type=data.get("attachmentType"),
                    nas_relative_path=data.get("nasRelativePath")
                )

                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid link request")})
                    return

                self.send_json_response(201, result)

            else:
                self.send_json_response(404, {"error": "Not Found"})

        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
        finally:
            conn.close()

    def handle_api_put(self):
        content_length = int(self.headers.get('Content-Length', 0))
        put_data = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(put_data)
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON"})
            return

        conn = database.get_connection()
        try:
            project_match = re.match(r"^/api/projects/([^/]+)$", self.path)
            task_match = re.match(r"^/api/tasks/([^/]+)$", self.path)
            user_role_match = re.match(r"^/api/users/([^/]+)/role$", self.path)

            if project_match:
                proj_id = project_match.group(1)
                result = APIRouter.update_project(conn, proj_id, data)

                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid project payload")})
                elif result:
                    self.send_json_response(200, result)
                else:
                    self.send_json_response(404, {"error": "Project not found"})

            elif task_match:
                task_id = task_match.group(1)
                result = APIRouter.update_task(conn, task_id, data)
                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid task payload")})
                elif result:
                    self.send_json_response(200, result)
                else:
                    self.send_json_response(404, {"error": "Task not found"})
            elif user_role_match:
                user_id = user_role_match.group(1)
                result = APIRouter.update_user_role(conn, user_id, data.get("role", ""))
                if result == "invalid-role":
                    self.send_json_response(400, {"error": "Invalid role"})
                elif result:
                    self.send_json_response(200, result)
                else:
                    self.send_json_response(404, {"error": "User not found"})
            else:
                self.send_json_response(404, {"error": "Not Found"})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
        finally:
            conn.close()

    def handle_api_delete(self):
        conn = database.get_connection()

        try:
            parsed = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed.query)
            acting_user_id = query_params.get("actingUserId", [""])[0]
            project_id = query_params.get("projectId", [""])[0]

            task_match = re.match(r"^/api/tasks/([^/]+)$", parsed.path)
            project_match = re.match(r"^/api/projects/([^/]+)$", parsed.path)
            attachment_match = re.match(r"^/api/attachments/([^/]+)$", parsed.path)

            if task_match:
                task_id = task_match.group(1)
                result = APIRouter.delete_task(conn, task_id, acting_user_id)

                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid delete request")})
                elif result:
                    self.send_json_response(200, result)
                else:
                    self.send_json_response(404, {"error": "Task not found"})
                return

            if project_match:
                p_id = project_match.group(1)
                result = APIRouter.delete_project(conn, p_id, acting_user_id)

                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid delete request")})
                elif result:
                    self.send_json_response(200, result)
                else:
                    self.send_json_response(404, {"error": "Project not found"})
                return

            if attachment_match:
                attachment_id = attachment_match.group(1)
                result = APIRouter.delete_attachment(conn, attachment_id, project_id, acting_user_id)

                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid delete request")})
                else:
                    self.send_json_response(200, result)
                return

            self.send_json_response(404, {"error": "Not Found"})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})
        finally:
            conn.close()

    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)


def run_server():
    # Make sure DB is initialized
    database.initialize_database()
    
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ProjectManagerHTTPHandler)
    print(f"Project Manager Server started on http://localhost:{PORT}")
    print(f"Serving network connections. Share your IP on port {PORT} with other devices!")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()