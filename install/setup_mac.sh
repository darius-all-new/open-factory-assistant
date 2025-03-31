#!/bin/bash

# Open Factory Assistant Setup Script for Mac
# This script helps set up the environment for the Open Factory Assistant project

# Print with colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}Welcome to Open Factory Assistant Setup${NC}"
echo -e "${GREEN}This script will help you configure your environment.${NC}\n"

# Function to prompt for configuration values
get_user_config() {
    local prompt=$1
    local default=$2
    read -p "$prompt (default: $default): " input
    echo "${input:-$default}"
}

# Function to wait for a port to be available
wait_for_port() {
    local port=$1
    local timeout=$2
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))

    echo -e "${CYAN}Waiting for port $port to be available...${NC}"
    
    while [ $(date +%s) -lt $end_time ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo -e "${GREEN}Port $port is now available!${NC}"
            return 0
        fi
        sleep 2
    done
    
    echo -e "${RED}Timeout waiting for port $port${NC}"
    return 1
}

# Function to create initial user
create_initial_user() {
    local backend_url=$1
    
    echo -e "\n${CYAN}Let's create your initial user${NC}"
    read -p "Enter username: " username
    read -p "Enter email: " email
    read -s -p "Enter password (minimum 8 characters): " password
    echo
    read -s -p "Confirm password (minimum 8 characters): " password2
    echo

    if [ "$password" != "$password2" ]; then
        echo -e "${RED}Passwords do not match!${NC}"
        return 1
    fi

    echo -e "${CYAN}Creating user ($backend_url)...${NC}"

    # Create JSON payload
    json_data="{\"username\":\"$username\",\"email\":\"$email\",\"password\":\"$password\"}"

    # Make API request
    response=$(curl -s -k -X POST "$backend_url/users/register" \
        -H "Content-Type: application/json" \
        -d "$json_data")

    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to connect to backend!${NC}"
        return 1
    fi

    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}User created successfully!${NC}"
        echo -e "${GREEN}You can now log in with your username and password.${NC}"
        return 0
else
    echo -e "${RED}Failed to create user. HTTP status: $response${NC}"
    return 1
fi
}

# Function to open a new terminal window and run a command
open_new_terminal() {
    local title=$1
    local command=$2
    local working_dir=$3

    # Escape double quotes and other special characters
    command=$(echo "$command" | sed 's/"/\\"/g')
    working_dir=$(echo "$working_dir" | sed 's/"/\\"/g')

    osascript <<EOF
tell application "Terminal"
    activate
    set newTab to do script "cd \"$working_dir\" && printf '\\\e]1;$title\\\a' && $command"
end tell
EOF
}

# Get repository root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Check for SSL certificates
echo -e "\n${CYAN}Checking SSL certificates...${NC}"
cert_dir="$REPO_ROOT/certs"

if [ ! -d "$cert_dir" ]; then
    echo -e "${RED}Certificates directory not found at: $cert_dir${NC}"
    echo -e "Please create the directory and add your SSL certificates."
    exit 1
fi

cert_name="localhost"
key_name="localhost-key"

if [ ! -f "$cert_dir/$cert_name.pem" ] || [ ! -f "$cert_dir/$key_name.pem" ]; then
    echo -e "${RED}SSL certificates not found:${NC}"
    echo -e "Expected files:"
    echo -e "  - $cert_dir/$cert_name.pem"
    echo -e "  - $cert_dir/$key_name.pem"
    echo -e "Please make sure these files exist."
    exit 1
fi

echo -e "${GREEN}Found SSL certificates!${NC}"

# Create environment files if they don't exist
components=("backend" "frontend" "scanner")
for component in "${components[@]}"; do
    component_path="$REPO_ROOT/$component"
    
    # Create component directory if it doesn't exist
    if [ ! -d "$component_path" ]; then
        mkdir -p "$component_path"
        echo -e "${GREEN}Created directory for $component${NC}"
    fi
    
    env_file="$component_path/.env"
    env_example="$component_path/.env.example"
    
    # Create empty .env file if .env.example doesn't exist
    if [ ! -f "$env_example" ]; then
        touch "$env_file"
        echo -e "${GREEN}Created empty .env file for $component${NC}"
    # Copy .env.example to .env if it exists and .env doesn't
    elif [ ! -f "$env_file" ]; then
        cp "$env_example" "$env_file"
        echo -e "${GREEN}Created .env file from example for $component${NC}"
    fi
done

# Check Python installation
echo -e "\n${CYAN}Checking Python installation ...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python is not installed! Please install Python and try again.${NC}"
    echo "You can install Python using Homebrew: brew install python3"
    exit 1
fi
python_version=$(python3 --version)
echo -e "${GREEN}Found Python: $python_version${NC}"

# Check Node.js installation
echo -e "\n${CYAN}Checking Node.js installation ...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed! Please install Node.js and try again.${NC}"
    echo "You can install Node.js using Homebrew: brew install node"
    exit 1
fi
node_version=$(node --version)
echo -e "${GREEN}Found Node.js: $node_version${NC}"

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed! Please install npm and try again.${NC}"
    exit 1
fi
npm_version=$(npm --version)
echo -e "${GREEN}Found npm: $npm_version${NC}"

# Setup Python virtual environment
echo -e "\n${CYAN}Setting up Python virtual environment ...${NC}"
venv_name=$(get_user_config "Enter virtual environment name" "venv")
venv_path="$REPO_ROOT/$venv_name"

if [ -d "$venv_path" ]; then
    echo -e "${YELLOW}Virtual environment '$venv_name' already exists.${NC}"
else
    python3 -m venv "$venv_path"
    echo -e "${GREEN}Created virtual environment: $venv_name${NC}"
fi

# Activate virtual environment and install requirements
echo -e "\n${CYAN}Installing Python requirements...${NC}"
source "$venv_path/bin/activate"
requirements_file="$REPO_ROOT/backend/requirements.txt"
if [ -f "$requirements_file" ]; then
    pip install -r "$requirements_file"
    echo -e "${GREEN}Installed Python requirements${NC}"
else
    echo -e "${RED}Could not find requirements.txt${NC}"
    exit 1
fi

# Install npm dependencies
echo -e "\n${CYAN}Installing npm dependencies...${NC}"
for component in "frontend" "scanner"; do
    component_path="$REPO_ROOT/$component"
    if [ -f "$component_path/package.json" ]; then
        echo -e "\nInstalling dependencies for $component..."
        cd "$component_path"
        npm install
        echo -e "${GREEN}Installed npm dependencies for $component${NC}"
    fi
done

# Get local IP address
local_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
echo -e "Local IP address: $local_ip"
if [ -z "$local_ip" ]; then
    local_ip="localhost"
fi

# Configure environment variables
echo -e "\n${CYAN}Configuring environment variables...${NC}"

# Backend configuration
backend_port=$(get_user_config "Enter backend port" "8000")
cat > "$REPO_ROOT/backend/.env" << EOL
PORT=$backend_port
HOST=0.0.0.0
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=$(openssl rand -hex 32)
REFRESH_SECRET_KEY=$(openssl rand -hex 32)
ACCESS_TOKEN_EXPIRE_MINUTES=600
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
ADDITIONAL_HOSTS=$local_ip  # Your local IP address
CORS_ORIGINS=https://localhost:3001,https://localhost:3000,https://$local_ip:3001,https://$local_ip:3000
CERT_KEY=$cert_dir/$key_name.pem
CERT_CERT=$cert_dir/$cert_name.pem
EOL

# Frontend configuration
echo -e "\n${CYAN}Configuring frontend environment variables...${NC}"
cat > "$REPO_ROOT/frontend/.env" << EOL
VITE_API_URL=https://$local_ip:$backend_port
SSL_KEY=$key_name.pem
SSL_CERT=$cert_name.pem
EOL

# Scanner configuration
echo -e "\n${CYAN}Configuring scanner environment variables...${NC}"
cat > "$REPO_ROOT/scanner/.env" << EOL
VITE_API_URL=https://$local_ip:$backend_port
SSL_KEY=$key_name.pem
SSL_CERT=$cert_name.pem
EOL

# Ask if user wants to start the services
read -p $'\n'"Would you like to start all services now? (y/n): " start_services
if [ "$start_services" = "y" ]; then
    # Start backend
    echo -e "\n${CYAN}Starting backend service...${NC}"
    backend_command="source \"$venv_path/bin/activate\" && cd backend && uvicorn main:app --host 0.0.0.0 --port $backend_port --ssl-keyfile=\"$cert_dir/$key_name.pem\" --ssl-certfile=\"$cert_dir/$cert_name.pem\""
    open_new_terminal "Backend" "$backend_command" "$REPO_ROOT"
    
    echo -e "${CYAN}Waiting for backend to start...${NC}"
    # Give backend some time to start
    sleep 5
    
    # Wait for backend to start
    if wait_for_port $backend_port 30; then
        read -p $'\n'"Would you like to create a user now? (y/n): " create_user
        if [ "$create_user" = "y" ]; then
            while ! create_initial_user "https://$local_ip:$backend_port"; do
                read -p "Would you like to try creating a user again? (y/n): " retry
                if [ "$retry" != "y" ]; then
                    break
                fi
            done
        fi
        
        # Start frontend
        echo -e "\n${CYAN}Starting frontend service...${NC}"
        open_new_terminal "Frontend" "cd frontend && npm run dev" "$REPO_ROOT"
        sleep 2
        
        # Start scanner
        echo -e "\n${CYAN}Starting scanner service...${NC}"
        open_new_terminal "Scanner" "cd scanner && npm run dev" "$REPO_ROOT"
        sleep 2
        
        echo -e "\n${GREEN}All services have been started in separate terminal windows!${NC}"
        echo -e "${YELLOW}Note: You may need to accept the self-signed certificate warning in your browser.${NC}"
    else
        echo -e "${RED}Backend failed to start. Please check the backend terminal for errors.${NC}"
        exit 1
    fi
fi

echo -e "\n${GREEN}Setup complete! Thank you for using Open Factory Assistant!${NC}"
