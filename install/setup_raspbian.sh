#!/bin/bash

# Open Factory Assistant Setup Script for Raspberry Pi (Raspbian)
# Simplified script to set up the environment and system services

# Print with colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Get repository root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Update system and install dependencies
apt update
apt install -y python3-pip python3-venv nodejs npm

# Setup Python virtual environment in project directory
VENV_PATH="$REPO_ROOT/backend/ofa"
python3 -m venv $VENV_PATH
source $VENV_PATH/bin/activate
pip install --progress-bar=on -r "$REPO_ROOT/backend/requirements.txt"

echo -e "${GREEN}Python environment setup complete.${NC}"

# Get user configuration inputs
local_ip=$(hostname -I | cut -d' ' -f1)
read -p "Enter backend port (default: 8000): " backend_port
backend_port=${backend_port:-8000}
read -p "Enter frontend port (default: 3001): " frontend_port
frontend_port=${frontend_port:-3001}
read -p "Enter scanner port (default: 3000): " scanner_port
scanner_port=${scanner_port:-3000}
read -p "Enter location of SSL key (default: localhost-key): " certKey
certKey=${certKey:-localhost-key}
read -p "Enter location of SSL certificate (default: localhost): " certCert
certCert=${certCert:-localhost}

# Configure backend
echo -e "\n${CYAN}Configuring backend...${NC}"
cat > "$REPO_ROOT/backend/.env" << EOL
HOST=0.0.0.0
PORT=$backend_port
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=$(openssl rand -hex 32)
REFRESH_SECRET_KEY=$(openssl rand -hex 32)
ACCESS_TOKEN_EXPIRE_MINUTES=600
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
ADDITIONAL_HOSTS=$local_ip  # Your local IP address
CORS_ORIGINS=https://localhost:3001,https://localhost:3000,https://$local_ip:3001,https://$local_ip:3000
CERT_KEY="$REPO_ROOT/certs/$certKey"
CERT_CERT="$REPO_ROOT/certs/$certCert"
EOL

# Configure frontend
echo -e "\n${CYAN}Configuring frontend...${NC}"
cat > "$REPO_ROOT/frontend/.env" << EOL
VITE_API_URL=https://$local_ip:$backend_port
SSL_KEY="$REPO_ROOT/certs/$certKey"
SSL_CERT="$REPO_ROOT/certs/$certCert"
EOL

# Configure scanner
echo -e "\n${CYAN}Configuring scanner...${NC}"
cat > "$REPO_ROOT/scanner/.env" << EOL
VITE_API_URL=https://$local_ip:$backend_port
SSL_KEY="$REPO_ROOT/certs/$certKey"
SSL_CERT="$REPO_ROOT/certs/$certCert"
EOL

# Install frontend dependencies
cd "$REPO_ROOT/frontend"
npm install --force --progress=true

# Install scanner dependencies
cd "$REPO_ROOT/scanner"
npm install --force --progress=true

# Create systemd service for backend
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
cat > /etc/systemd/system/factoryapp-frontend.service << EOL
[Unit]
Description=Factory Assistant Frontend
After=network.target

[Service]
Type=simple
User=factoryapp
WorkingDirectory=$REPO_ROOT/frontend
Environment=PATH=/usr/bin:/bin:/usr/local/bin
ExecStart=/usr/bin/npm run dev
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Create systemd service for scanner
cat > /etc/systemd/system/factoryapp-scanner.service << EOL
[Unit]
Description=Factory Assistant Scanner
After=network.target

[Service]
Type=simple
User=factoryapp
WorkingDirectory=$REPO_ROOT/scanner
Environment=PATH=/usr/bin:/bin:/usr/local/bin
ExecStart=/usr/bin/npm run dev
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Set permissions
chown -R factoryapp:factoryapp "$REPO_ROOT"

# Start and enable services
systemctl daemon-reload
systemctl enable factoryapp-backend
systemctl enable factoryapp-frontend
systemctl enable factoryapp-scanner
systemctl start factoryapp-backend
systemctl start factoryapp-frontend
systemctl start factoryapp-scanner

# Function to create an initial user
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

# Wait for backend to start
echo -e "\n${CYAN}Waiting for backend to start...${NC}"
sleep 10

# Create initial user
backend_url="https://$local_ip:$backend_port"
create_initial_user "$backend_url"

# Completion message
echo -e "${GREEN}Setup complete! Services are running.${NC}"
