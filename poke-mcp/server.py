import subprocess
import json
import os
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from fastmcp import FastMCP

# Project root directory
PROJECT_ROOT = "/Users/achakrav6/Desktop/treehacks26"

mcp = FastMCP("Robotics Motion Training Platform")


@mcp.tool()
def run_dev_server() -> str:
    """Start the Next.js development server on localhost:3000."""
    try:
        result = subprocess.run(
            ["npm", "run", "dev"],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            timeout=5
        )
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return "Dev server is starting in the background. Visit http://localhost:3000"
    except Exception as e:
        return f"Error starting dev server: {str(e)}"


@mcp.tool()
def build_project() -> str:
    """Build the Next.js project for production."""
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            timeout=300
        )
        if result.returncode == 0:
            return f"Build successful!\n\n{result.stdout}"
        else:
            return f"Build failed with errors:\n\n{result.stderr}"
    except Exception as e:
        return f"Error building project: {str(e)}"


@mcp.tool()
def run_linter() -> str:
    """Run ESLint to check code quality and identify issues."""
    try:
        result = subprocess.run(
            ["npm", "run", "lint"],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            timeout=60
        )
        return result.stdout + result.stderr
    except Exception as e:
        return f"Error running linter: {str(e)}"


@mcp.tool()
def list_api_endpoints() -> str:
    """List all API endpoints available in the application."""
    try:
        api_dir = Path(PROJECT_ROOT) / "app" / "api"
        endpoints = []

        for route_file in api_dir.rglob("route.ts"):
            # Convert path to API endpoint format
            rel_path = route_file.relative_to(api_dir)
            endpoint = "/" + str(rel_path.parent).replace("\\", "/")

            # Read file to detect HTTP methods
            with open(route_file, 'r') as f:
                content = f.read()
                methods = []
                if "export async function GET" in content:
                    methods.append("GET")
                if "export async function POST" in content:
                    methods.append("POST")
                if "export async function PATCH" in content:
                    methods.append("PATCH")
                if "export async function DELETE" in content:
                    methods.append("DELETE")
                if "export async function PUT" in content:
                    methods.append("PUT")

            endpoints.append({
                "endpoint": f"/api{endpoint}",
                "methods": methods,
                "file": str(route_file.relative_to(PROJECT_ROOT))
            })

        return json.dumps(endpoints, indent=2)
    except Exception as e:
        return f"Error listing API endpoints: {str(e)}"


@mcp.tool()
def get_project_structure() -> str:
    """Get an overview of the project directory structure."""
    try:
        result = subprocess.run(
            ["find", ".", "-type", "f", "-name", "*.tsx", "-o", "-name", "*.ts", "-o", "-name", "*.json"],
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            timeout=30
        )
        lines = result.stdout.strip().split('\n')
        # Filter out node_modules and .git
        filtered = [l for l in lines if 'node_modules' not in l and '.git' not in l and l.strip()]
        return '\n'.join(sorted(filtered)[:100])  # Limit to first 100 files
    except Exception as e:
        return f"Error getting project structure: {str(e)}"


@mcp.tool()
def get_package_info() -> str:
    """Get package.json information including dependencies and scripts."""
    try:
        package_path = Path(PROJECT_ROOT) / "package.json"
        with open(package_path, 'r') as f:
            data = json.load(f)

        info = {
            "name": data.get("name"),
            "version": data.get("version"),
            "scripts": data.get("scripts", {}),
            "dependencies": list(data.get("dependencies", {}).keys()),
            "devDependencies": list(data.get("devDependencies", {}).keys())
        }
        return json.dumps(info, indent=2)
    except Exception as e:
        return f"Error reading package.json: {str(e)}"


@mcp.tool()
def check_firebase_config() -> str:
    """Check if Firebase configuration files exist and are properly set up."""
    try:
        config_files = [
            "lib/firebase.ts",
            "lib/firebase.js",
            ".env.local",
            ".env"
        ]

        results = {}
        for config_file in config_files:
            file_path = Path(PROJECT_ROOT) / config_file
            results[config_file] = {
                "exists": file_path.exists(),
                "path": str(file_path) if file_path.exists() else "Not found"
            }

        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error checking Firebase config: {str(e)}"


@mcp.tool()
def list_pages() -> str:
    """List all pages/routes in the Next.js application."""
    try:
        app_dir = Path(PROJECT_ROOT) / "app"
        pages = []

        for page_file in app_dir.rglob("page.tsx"):
            rel_path = page_file.relative_to(app_dir)
            route = "/" + str(rel_path.parent).replace("\\", "/")
            if route == "/.":
                route = "/"

            # Try to extract page description from comments or title
            with open(page_file, 'r') as f:
                content = f.read()
                # Look for common patterns
                description = "Page"
                if "export default function" in content:
                    import re
                    match = re.search(r'export default function (\w+)', content)
                    if match:
                        description = f"{match.group(1)} page"

            pages.append({
                "route": route,
                "description": description,
                "file": str(rel_path)
            })

        return json.dumps(sorted(pages, key=lambda x: x["route"]), indent=2)
    except Exception as e:
        return f"Error listing pages: {str(e)}"


@mcp.tool()
def analyze_pose_detection_setup() -> str:
    """Analyze the TensorFlow.js pose detection configuration and components."""
    try:
        components_dir = Path(PROJECT_ROOT) / "components"
        lib_dir = Path(PROJECT_ROOT) / "lib"

        findings = {
            "tensorflow_files": [],
            "pose_detection_usage": []
        }

        # Search for TensorFlow/pose detection related files
        for pattern in ["*.tsx", "*.ts", "*.jsx", "*.js"]:
            for file_path in components_dir.glob(pattern):
                with open(file_path, 'r') as f:
                    content = f.read()
                    if "@tensorflow" in content or "pose-detection" in content or "poseDetection" in content:
                        findings["tensorflow_files"].append(str(file_path.relative_to(PROJECT_ROOT)))

                        # Extract key pose detection patterns
                        if "createDetector" in content:
                            findings["pose_detection_usage"].append({
                                "file": str(file_path.relative_to(PROJECT_ROOT)),
                                "note": "Creates pose detector"
                            })

        if lib_dir.exists():
            for pattern in ["*.tsx", "*.ts", "*.jsx", "*.js"]:
                for file_path in lib_dir.glob(pattern):
                    with open(file_path, 'r') as f:
                        content = f.read()
                        if "@tensorflow" in content or "pose-detection" in content:
                            findings["tensorflow_files"].append(str(file_path.relative_to(PROJECT_ROOT)))

        return json.dumps(findings, indent=2)
    except Exception as e:
        return f"Error analyzing pose detection setup: {str(e)}"


@mcp.tool()
def get_environment_variables() -> str:
    """List required environment variables for the project (without exposing values)."""
    try:
        env_example_path = Path(PROJECT_ROOT) / ".env.example"
        env_local_path = Path(PROJECT_ROOT) / ".env.local"
        env_path = Path(PROJECT_ROOT) / ".env"

        result = {
            "env_files": {
                ".env.example": env_example_path.exists(),
                ".env.local": env_local_path.exists(),
                ".env": env_path.exists()
            },
            "detected_env_vars": []
        }

        # Scan code for environment variable usage
        api_dir = Path(PROJECT_ROOT) / "app" / "api"
        env_vars = set()

        for ts_file in api_dir.rglob("*.ts"):
            with open(ts_file, 'r') as f:
                content = f.read()
                import re
                matches = re.findall(r'process\.env\.(\w+)', content)
                env_vars.update(matches)

        result["detected_env_vars"] = sorted(list(env_vars))

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error checking environment variables: {str(e)}"


def _api_base() -> str:
    """Base URL for the Next.js API (used by follow tools)."""
    return os.environ.get("ROBODATA_API_BASE", "http://localhost:3000")


@mcp.tool()
def robodata_health_check() -> str:
    """
    Check if the RoboData API is reachable from this MCP server.
    Calls GET /api/tasks (no params). Use this to verify ROBODATA_API_BASE and network.
    """
    try:
        url = f"{_api_base()}/api/tasks"
        req = Request(url, method="GET")
        with urlopen(req, timeout=10) as resp:
            data = resp.read().decode()
        return json.dumps({
            "ok": True,
            "api_base": _api_base(),
            "message": "API reachable",
            "tasks_response_length": len(data),
        }, indent=2)
    except (URLError, HTTPError) as e:
        return json.dumps({
            "ok": False,
            "api_base": _api_base(),
            "error": str(e),
        }, indent=2)
    except Exception as e:
        return json.dumps({"ok": False, "api_base": _api_base(), "error": str(e)}, indent=2)


@mcp.tool()
def get_followed_businesses(user_id: str) -> str:
    """
    Get the list of companies (businesses) that a user follows.
    Returns JSON with a 'follows' array of { businessId, businessName }.
    Use this to know which companies a given user is following.
    """
    try:
        url = f"{_api_base()}/api/follows?userId={user_id}"
        req = Request(url, method="GET")
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        return json.dumps(data, indent=2)
    except (URLError, HTTPError) as e:
        return json.dumps({"error": str(e)})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def get_followers_for_business(business_id: str) -> str:
    """
    Get the list of users who follow a given business/company.
    Returns JSON with a 'followers' array of { userId, displayName?, email? }.
    Use this when a business posts a new job to find which users to notify (e.g. send a Poke message).
    """
    try:
        url = f"{_api_base()}/api/follows?businessId={business_id}"
        req = Request(url, method="GET")
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        return json.dumps(data, indent=2)
    except (URLError, HTTPError) as e:
        return json.dumps({"error": str(e)})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def get_new_tasks_since(since_iso: str) -> str:
    """
    Get tasks created at or after the given ISO timestamp (e.g. 5 minutes ago for new jobs).
    Returns JSON array of tasks with id, title, businessId, businessName, description, etc.
    Use this to find recently posted jobs so you can notify followers of that business.
    """
    try:
        url = f"{_api_base()}/api/tasks?since={since_iso}"
        req = Request(url, method="GET")
        with urlopen(req, timeout=10) as resp:
            data = resp.read().decode()
        return data if data.startswith("[") else json.dumps(json.loads(data), indent=2)
    except (URLError, HTTPError) as e:
        return json.dumps({"error": str(e)})
    except Exception as e:
        return json.dumps({"error": str(e)})


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8765)
