# Robotics Motion Training Platform - MCP Server

This MCP (Model Context Protocol) server wraps the functionality of the Robotics Motion Training Platform, a Next.js application for crowdsourced robotics training data collection using pose detection.

## 🚀 Quick Start

The server is already running at: **http://0.0.0.0:8765/mcp**

### Prerequisites
- Python 3.8+
- The project directory at `/Users/achakrav6/Desktop/treehacks26`

### Installation
```bash
cd /Users/achakrav6/Desktop/treehacks26/poke-mcp
uv venv .venv
uv pip install -r requirements.txt -p .venv/bin/python
```

### Running the Server
```bash
/Users/achakrav6/Desktop/treehacks26/poke-mcp/.venv/bin/python /Users/achakrav6/Desktop/treehacks26/poke-mcp/server.py
```

The server will start on `http://0.0.0.0:8765/mcp` using the Streamable HTTP transport.

## 🛠 Available Tools

### 1. **run_dev_server**
Start the Next.js development server on localhost:3000.
- Useful for: Local development and testing
- Timeout: 5 seconds (server starts in background)

### 2. **build_project**
Build the Next.js project for production.
- Useful for: Deployment preparation, checking for build errors
- Timeout: 300 seconds

### 3. **run_linter**
Run ESLint to check code quality and identify issues.
- Useful for: Code quality checks, identifying linting issues
- Timeout: 60 seconds

### 4. **list_api_endpoints**
List all API endpoints available in the application.
- Returns: JSON array of endpoints with HTTP methods and file paths
- Endpoints include:
  - `/api/tasks` - Task management (GET, POST, PATCH)
  - `/api/submissions` - Submission handling
  - `/api/developer` - API key management
  - `/api/stats` - Analytics data
  - `/api/profile` - User profile management
  - `/api/billing` - Billing operations
  - `/api/generate-angles` - 3D angle generation using Replicate

### 5. **get_project_structure**
Get an overview of the project directory structure.
- Returns: List of TypeScript/JavaScript files (excluding node_modules)
- Useful for: Understanding project organization

### 6. **get_package_info**
Get package.json information including dependencies and scripts.
- Returns: JSON with name, version, scripts, dependencies, devDependencies
- Key dependencies:
  - Next.js 16.1.6
  - React 19.2.3
  - TensorFlow.js with pose detection
  - Three.js for 3D visualization
  - Firebase for backend

### 7. **check_firebase_config**
Check if Firebase configuration files exist and are properly set up.
- Checks: `lib/firebase.ts`, `.env.local`, `.env`
- Returns: JSON with file existence status

### 8. **list_pages**
List all pages/routes in the Next.js application.
- Returns: JSON array of routes with descriptions
- Pages include:
  - `/` - Home page
  - `/login` - Login page
  - `/signup` - Signup page
  - `/userUpload` - Motion recording page
  - `/business` - Business dashboard
  - `/contributions` - User contributions
  - `/earnings` - Earnings tracking
  - `/billing` - Billing management
  - `/stats` - Analytics and statistics
  - `/developer` - API integration
  - `/gallery` - Gallery view

### 9. **analyze_pose_detection_setup**
Analyze the TensorFlow.js pose detection configuration and components.
- Returns: JSON with TensorFlow files and pose detection usage patterns
- Useful for: Understanding the AI/ML setup

### 10. **get_environment_variables**
List required environment variables for the project.
- Detects: Environment variable usage in code
- Shows: Which env files exist (.env.example, .env.local, .env)
- Does not expose values for security

## 📋 Project Overview

The **Robotics Motion Training Platform** is a web application that:
- Allows businesses to post tasks requiring motion capture data
- Enables contributors to record themselves performing tasks using their webcam
- Uses TensorFlow.js for real-time pose detection (17 keypoints tracked)
- Generates 3D skeletal data for robotics training
- Provides API endpoints for programmatic data access
- Integrates with Replicate API for 3D angle generation
- Uses Firebase for authentication and data storage

## 🏗 Architecture

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **AI/ML**: TensorFlow.js with pose detection (@tensorflow-models/pose-detection)
- **3D Graphics**: Three.js with React Three Fiber
- **Backend**: Firebase (Firestore)
- **API**: RESTful endpoints in `/app/api/`
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion

## 🔗 Integration

To use this MCP server with an MCP client:

1. Configure the client to connect to: `http://0.0.0.0:8765/mcp`
2. Use the Streamable HTTP transport
3. Call any of the 10 available tools listed above

## 📝 Notes

- The server runs on the local filesystem and can execute commands in the project directory
- All file operations are read-only except for build/dev commands
- Environment variables are detected but not exposed for security
- The server is designed to work alongside the running Next.js application

## 🔒 Security

- No environment variable values are exposed
- File paths are validated to stay within the project directory
- All subprocess commands use explicit `cwd` parameter
- Error messages are sanitized to avoid leaking sensitive information
