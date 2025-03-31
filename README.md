# OpenFactoryAssistant

Welcome to OpenFactoryAssistant!

OpenFactoryAssistant is an open-source factory management solution aimed at manufacturers who want to explore digital transformation but who want to avoid significant investment until they have more confidence in what digital tools can do for them.

**NOTE: OpenFactoryAssistant is a work in progress. Feedback on features, user experience etc. is very welcome!**

## Features

OpenFactoryAssistant has been built to help you take your first steps into digital transformation. At the moment, job tracking is the primary feature available, but there is a lot planned for the future!

### Core Features

- **Job Tracking**: Monitor jobs as they move through your factory
- **QR Code Integration**: Easily scan and update job locations using QR codes via the browser on your mobile device
- **Multi-Station Management**: Define and manage multiple work stations
- **Pre-made Information Views**: Put up data visualisations on office screens to easily identify bottlenecks, free capacity and more.

## Deployment Guide

### Prerequisites

- Python 3.8 or higher
- Node.js 16.x or higher
- Optional: mkcert (for SSL certificate generation)

### SSL Certificate Setup

In order to use, for example, an iPhone's camera via the browser for QR scanning, OpenFactoryAssistant needs to run on HTTPS. To do this, we need to generate an SSL certificate and put the files (key and cert) in each subfolder of the project (backend, frontend, and scanner):

1. Generate certificate with mkcert:

mkcert is a useful tool for making certificates ([link](https://github.com/FiloSottile/mkcert)). Install mkcert and then run the following:

```bash
# Generate certificates:
cd certs
mkcert localhost
```

You don't need to use mkcert (it is an easy option though). Just make sure you have the key and cert files in the `certs` folder.

### Browser Compatibility

OpenFactoryAssistant is at an early stage so, for the best experience:

- **Recommended Browser**: Google Chrome is the recommended browser for development and testing
- **Other Browsers**: Firefox and Safari may have issues with self-signed certificates in development
- **Certificate Warning**: When accessing the application in Chrome, you'll need to accept the self-signed certificate warning (click "Advanced" -> "Proceed to YOUR LOCAL IP")

### Setup Options

We provide both automated and manual setup options. Choose the one that suits you best.

#### Automated Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/darius-all-new/open-factory-assistant.git
   cd open-factory-assistant
   ```

2. Run the setup script:

   **For Mac users:**

   ```bash
   chmod +x install/setup_mac.sh
   ./install/setup_mac.sh
   ```

   **For Windows users:**

   ```powershell
   .\install\setup_windows.ps1
   ```

   **For Raspberry Pi users:**

   ```bash
   chmod +x install/setup_raspbian.sh
   ./install/setup_raspbian.sh
   ```

   The setup script will:

   - Create necessary environment files (.env)
   - Check Python and Node.js installations
   - Set up a Python virtual environment
   - Install Python requirements
   - Install npm dependencies
   - Configure environment variables
   - Launch the services (backend, frontend, and scanner)
   - Create a user (optional)

#### Manual Setup

If you prefer manual setup, follow the steps below:

### Backend Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/darius-all-new/open-factory-assistant.git
   cd open-factory-assistant
   ```

2. Set up Python virtual environment (called "ofa"):

   ```bash
   python -m venv ofa
   source ofa/bin/activate  # On Windows: ofa\Scripts\activate
   pip install -r requirements.txt
   ```

3. Configure environment variables:

You will need to set a secret key, host, port, key/cert location and make sure CORS origins are set correctly.

```bash
cp .env.example .env
# Edit .env with your configuration
# Make sure to set HTTPS=true and update SSL certificate paths
```

4. Start the backend server:
   ```bash
   python run.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install # On Windows you may need to run: npm install --force
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev # On Windows: npm run dev:host
   ```

### Scanner Setup

1. Navigate to the scanner directory:

   ```bash
   cd scanner
   ```

2. Install dependencies:

   ```bash
   npm install # On Windows you may need to run: npm install --force
   ```

3. Configure the scanner:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the scanner application:
   ```bash
   npm run dev # On Windows: npm run dev:host
   ```

### Enabling Mobile Device Access (Windows)

To make sure OpenFactoryAssistant is accessible on your local network:

1. **Configure Network Profile**

   - Open Windows Settings
   - Go to Network & Internet
   - Click on your active network connection
   - Change network profile from "Public" to "Private"

2. **Add Firewall Rules**

   - Open "Windows Defender Firewall with Advanced Security" (search for it in Start menu)
   - Click "Inbound Rules" in the left panel
   - Click "New Rule..." in the right panel
   - Add rules for both required ports:

   For Scanner (Port 3000):

   - Rule Type: Port
   - Protocol: TCP
   - Port: 3000
   - Action: Allow the connection
   - Profile: Check all (Domain, Private, Public)
   - Name: "Open Factory Scanner (3000)"

   For Backend (Port 8000):

   - Repeat above steps but use port 8000
   - Name: "Open Factory Backend (8000)"

3. **Verify Configuration**
   - Ensure scanner is running with host flag enabled (`npm run dev:host`)
   - Access scanner from mobile device using:
     ```
     https://<windows-pc-ip>:3000
     ```
   - Replace `<windows-pc-ip>` with your Windows PC's local IP address
   - Accept the security certificate warning on first access (development only)

## Documentation

TODO: Detailed documentation
