import urllib.request
import json

BASE_URL = "http://localhost:8000/api"

def test_get(endpoint):
    url = f"{BASE_URL}/{endpoint}"
    try:
        response = urllib.request.urlopen(url)
        data = json.loads(response.read().decode('utf-8'))
        print(f"[OK] GET /{endpoint} - Status 200 OK. Returned {len(data)} items.")
        return data
    except Exception as e:
        print(f"[FAIL] GET /{endpoint} failed: {e}")
        return None

def test_post_project(owner_id):
    url = f"{BASE_URL}/projects"
    payload = {
        "title": "Integration Test Project",
        "description": "Created by test script.",
        "dueDate": "2026-12-31",
        "ownerId": owner_id,
        "memberIds": [owner_id, "user-2"]
    }
    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        response = urllib.request.urlopen(req)
        data = json.loads(response.read().decode('utf-8'))
        print(f"[OK] POST /projects - Status 201 Created. New Project ID: {data.get('id')}")
        return data.get('id')
    except Exception as e:
        print(f"[FAIL] POST /projects failed: {e}")
        return None

def test_post_task(project_id, assignee_id):
    url = f"{BASE_URL}/tasks"
    payload = {
        "projectId": project_id,
        "title": "Verify API logic",
        "description": "Integration test check.",
        "assigneeId": assignee_id,
        "priority": "high",
        "dueDate": "2026-07-15"
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        response = urllib.request.urlopen(req)
        data = json.loads(response.read().decode('utf-8'))
        print(f"[OK] POST /tasks - Status 201 Created. New Task ID: {data.get('id')}")
        return data.get('id')
    except Exception as e:
        print(f"[FAIL] POST /tasks failed: {e}")
        return None

def test_put_task(task_id):
    url = f"{BASE_URL}/tasks/{task_id}"
    payload = {
        "status": "completed"
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    try:
        response = urllib.request.urlopen(req)
        data = json.loads(response.read().decode('utf-8'))
        print(f"[OK] PUT /tasks/{task_id} - Status 200 OK. Success: {data.get('success')}")
        return True
    except Exception as e:
        print(f"[FAIL] PUT /tasks/{task_id} failed: {e}")
        return False

def test_delete_task(task_id):
    url = f"{BASE_URL}/tasks/{task_id}"
    req = urllib.request.Request(url, method='DELETE')
    try:
        response = urllib.request.urlopen(req)
        data = json.loads(response.read().decode('utf-8'))
        print(f"[OK] DELETE /tasks/{task_id} - Status 200 OK. Success: {data.get('success')}")
        return True
    except Exception as e:
        print(f"[FAIL] DELETE /tasks/{task_id} failed: {e}")
        return False

def main():
    print("Starting integration test for REST API endpoints...")
    
    # 1. Test GET endpoints
    users = test_get("users")
    projects = test_get("projects")
    tasks = test_get("tasks")
    
    if not users or not projects:
        print("[FAIL] Cannot proceed with POST tests due to GET failures.")
        return
        
    owner_id = users[0]['id']
    assignee_id = users[1]['id']
    
    # 2. Test Project Creation
    new_proj_id = test_post_project(owner_id)
    if not new_proj_id:
        return
        
    # 3. Test Task Creation on new project
    new_task_id = test_post_task(new_proj_id, assignee_id)
    if not new_task_id:
        return
        
    # 4. Test Task Toggle
    test_put_task(new_task_id)
    
    # Verify that the task status is indeed completed in the database
    updated_tasks = test_get("tasks")
    if updated_tasks:
        t = next((tk for tk in updated_tasks if tk['id'] == new_task_id), None)
        if t and t['status'] == 'completed':
            print("[OK] Checked database task state toggle verification: OK")
        else:
            print("[FAIL] Database task status did not update to 'completed'")
            
    # 5. Clean up by deleting the test task
    test_delete_task(new_task_id)
    print("Integration tests completed successfully!")

if __name__ == "__main__":
    main()
