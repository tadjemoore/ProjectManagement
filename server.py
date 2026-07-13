import json
import re
import urllib.parse
from http.server import SimpleHTTPRequestHandler, HTTPServer
import database
from datetime import datetime

PORT = 8000

class APIRouter:
    #TO-DO: add more helpers to simplify code
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

        if not title:
            return {"success": False, "status": 400, "error": "Project title is required."}
        if not owner_id:
            return {"success": False, "status": 400, "error": "Project owner is required."}
        
        cursor.execute("SELECT id FROM users WHERE id = ?", (owner_id,))
        if not cursor.fetchone():
            return {"success": False, "status": 400, "error": "Project owner does not exist."}
        
        if not isinstance(raw_members, list):
            return {"success": False, "status": 400, "error": "memberIds must be a list."}
        
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

            for user_id in cleaned_members:
                cursor.execute("""
                    INSERT INTO project_members (project_id, user_id)
                    VALUES (?, ?)
                """, (proj_id, user_id))
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

        if stored_password_hash != password:
            return None
        
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
        
        cursor.execute("""
            INSERT INTO users (id, name, role, avatar, username, password_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            name,
            role,
            avatar,
            username,
            password
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

    # API Request Handlers
    def handle_api_get(self):
        conn = database.get_connection()
        try:
            if self.path == "/api/users":
                data = APIRouter.get_users(conn)
                self.send_json_response(200, data)
            elif self.path == "/api/roles":
                data = APIRouter.get_roles(conn)
                self.send_json_response(200, data)
            elif self.path == "/api/admin/roles":
                data = APIRouter.get_admin_roles(conn)
                self.send_json_response(200, data)
            elif self.path == "/api/projects":
                data = APIRouter.get_projects(conn)
                self.send_json_response(200, data)
            elif self.path == "/api/tasks":
                data = APIRouter.get_tasks(conn)
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
            # Parse query string so actingUserId can be sent with DELETE request
            parsed = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed.query)
            acting_user_id = query_params.get("actingUserId", [""])[0]

            task_match = re.match(r"^/api/tasks/([^/]+)$", parsed.path)
            project_match = re.match(r"^/api/projects/([^/]+)$", parsed.path)

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
                project_id = project_match.group(1)
                result = APIRouter.delete_project(conn, project_id, acting_user_id)

                if isinstance(result, dict) and result.get("success") is False:
                    self.send_json_response(result.get("status", 400), {"error": result.get("error", "Invalid delete request")})
                elif result:
                    self.send_json_response(200, result)
                else:
                    self.send_json_response(404, {"error": "Project not found"})
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
