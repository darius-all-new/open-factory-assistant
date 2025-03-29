#!/bin/bash

# Open Factory Assistant Setup Script for Raspberry Pi (Raspbian)
# This script helps set up the environment and system services

# Print with colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}Welcome to Open Factory Assistant Setup for Raspberry Pi${NC}"
echo -e "${GREEN}This script will help you configure your environment and services.${NC}\n"

# Function to prompt for configuration values
get_user_config() {
    local prompt=$1
    local default=$2
    read -p "$prompt (default: $default): " input
    echo "${input:-$default}"
}

# Function to create initial user
create_initial_user() {
    local backend_url=$1
    
    echo -e "\n${CYAN}Let's create your initial user${NC}"
    read -p "Enter username: " username
    read -p "Enter email: " email
    read -s -p "Enter password: " password
    echo
    read -s -p "Confirm password: " password2
    echo

    if [ "$password" != "$password2" ]; then
        echo -e "${RED}Passwords do not match!${NC}"
        return 1
    fi

    # Create JSON payload
    json_data="{\"username\":\"$username\",\"email\":\"$email\",\"password\":\"$password\"}"

    # Make API request
    response=$(curl -s -X POST "$backend_url/users/register" \
        -H "Content-Type: application/json" \
        -d "$json_data")

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}User created successfully!${NC}"
        echo -e "${GREEN}You can now log in with your username and password.${NC}"
        return 0
    else
        echo -e "${RED}Failed to create user: $response${NC}"
        return 1
    fi
}

# Get repository root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Update system and install dependencies
echo -e "\n${CYAN}Updating system and installing dependencies...${NC}"
apt update
apt install -y python3-pip python3-venv nodejs npm openssl nginx

# Create service user
echo -e "\n${CYAN}Creating service user...${NC}"
useradd -r -s /bin/false factoryapp || true

# Setup Python virtual environment
echo -e "\n${CYAN}Setting up Python virtual environment...${NC}"
VENV_PATH="/opt/factoryapp/venv"
mkdir -p /opt/factoryapp
python3 -m venv $VENV_PATH

# Activate virtual environment and install requirements
source $VENV_PATH/bin/activate
pip install -r "$REPO_ROOT/backend/requirements.txt"

# Install frontend dependencies
echo -e "\n${CYAN}Installing frontend dependencies...${NC}"
cd "$REPO_ROOT/frontend"
npm install

# Install scanner dependencies
echo -e "\n${CYAN}Installing scanner dependencies...${NC}"
cd "$REPO_ROOT/scanner"
npm install

# Generate SSL certificates
echo -e "\n${CYAN}Generating SSL certificates...${NC}"
SSL_DIR="/opt/factoryapp/ssl"
mkdir -p $SSL_DIR

if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
    openssl req -x509 -newkey rsa:4096 -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" -days 365 -nodes -subj "/CN=localhost"
fi

# Get configuration
echo -e "\n${CYAN}Configuring environment...${NC}"
local_ip=$(hostname -I | cut -d' ' -f1)
backend_port=$(get_user_config "Enter backend port" "8000")
frontend_port=$(get_user_config "Enter frontend port" "8080")
scanner_port=$(get_user_config "Enter scanner port" "8081")

# Configure backend
echo -e "\n${CYAN}Configuring backend...${NC}"
cat > "$REPO_ROOT/backend/.env" << EOL
HOST=0.0.0.0
PORT=$backend_port
SSL_CERT=/opt/factoryapp/ssl/cert.pem
SSL_KEY=/opt/factoryapp/ssl/key.pem
EOL

# Configure frontend
echo -e "\n${CYAN}Configuring frontend...${NC}"
cat > "$REPO_ROOT/frontend/.env" << EOL
VITE_API_URL=https://$local_ip:$backend_port
EOL

# Configure scanner
echo -e "\n${CYAN}Configuring scanner...${NC}"
cat > "$REPO_ROOT/scanner/.env" << EOL
VITE_API_URL=https://$local_ip:$backend_port
EOL

# Create systemd service for backend
echo -e "\n${CYAN}Creating backend service...${NC}"
cat > /etc/systemd/system/factoryapp-backend.service << EOL
[Unit]
Description=Factory Assistant Backend
After=network.target

[Service]
Type=simple
User=factoryapp
WorkingDirectory=$REPO_ROOT/backend
Environment=PATH=$VENV_PATH/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$VENV_PATH/bin/python run.py
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Create systemd service for frontend
echo -e "\n${CYAN}Creating frontend service...${NC}"
cat > /etc/systemd/system/factoryapp-frontend.service << EOL
[Unit]
Description=Factory Assistant Frontend
After=network.target

[Service]
Type=simple
User=factoryapp
WorkingDirectory=$REPO_ROOT/frontend
Environment=PATH=/usr/bin:/bin:/usr/local/bin
ExecStart=/usr/bin/npm run preview -- --port $frontend_port --host
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Create systemd service for scanner
echo -e "\n${CYAN}Creating scanner service...${NC}"
cat > /etc/systemd/system/factoryapp-scanner.service << EOL
[Unit]
Description=Factory Assistant Scanner
After=network.target

[Service]
Type=simple
User=factoryapp
WorkingDirectory=$REPO_ROOT/scanner
Environment=PATH=/usr/bin:/bin:/usr/local/bin
ExecStart=/usr/bin/npm run preview -- --port $scanner_port --host
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Set permissions
echo -e "\n${CYAN}Setting permissions...${NC}"
chown -R factoryapp:factoryapp /opt/factoryapp
chown -R factoryapp:factoryapp "$REPO_ROOT"
chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

# Start and enable services
echo -e "\n${CYAN}Starting services...${NC}"
systemctl daemon-reload
systemctl enable factoryapp-backend
systemctl enable factoryapp-frontend
systemctl enable factoryapp-scanner
systemctl start factoryapp-backend
systemctl start factoryapp-frontend
systemctl start factoryapp-scanner

# Wait for backend to start
echo -e "\n${CYAN}Waiting for services to start...${NC}"
sleep 10

# Create initial user
backend_url="https://$local_ip:$backend_port"
create_initial_user "$backend_url"

echo -e "\n${GREEN}Setup complete! Your services are running at:${NC}"
echo -e "Backend: ${CYAN}https://$local_ip:$backend_port${NC}"
echo -e "Frontend: ${CYAN}http://$local_ip:$frontend_port${NC}"
echo -e "Scanner: ${CYAN}http://$local_ip:$scanner_port${NC}"
echo -e "\n${YELLOW}Note: The services will start automatically on boot.${NC}"
echo -e "${YELLOW}You can manage them with:${NC}"
echo -e "sudo systemctl status factoryapp-backend"
echo -e "sudo systemctl status factoryapp-frontend"
echo -e "sudo systemctl status factoryapp-scanner"
