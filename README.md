# OpenFactoryAssistant

Welcome to OpenFactoryAssistant!

OpenFactoryAssistant is an open-source factory management solution aimed at manufacturers who want to explore digital transformation but who want to avoid significant investment until they have more confidence in what digital tools can do for them.

## Features

OpenFactoryAssistant has been built to help you take your first steps into digital transformation:

### Core Features

- **Job Tracking**: Monitor jobs as they move through your factory
- **QR Code Integration**: Easily scan and update job locations using QR codes via the browser on your mobile device
- **Multi-Station Management**: Define and manage multiple work stations
- **Pre-made Information Views**: Get live insights into your factory's operations with several pre-made data visualisations

## Deployment Guide

### Prerequisites

- Python 3.8 or higher
- Node.js 16.x or higher

### SSL Certificate Setup

In order to use a mobile device's camera via the browser for QR scanning, our application needs to run on HTTPS. To do this, we need to generate an SSL certificate and put the files (key and cert) in each subfolder of the project (backend, frontend, and scanner):

1. Generate certificate with mkcert:

mkcert is a useful tool for making certificates ([link](https://github.com/FiloSottile/mkcert)). Install mkcert and then run the following:

```bash
# Generate certificates:
cd certs
mkcert localhost
```

You don't need to use mkcert. As long as you have the key and cert files in the `certs` folder, that's the important part.

### Browser Compatibility

For the best development experience:

- **Recommended Browser**: Google Chrome is the recommended browser for development and testing
- **Other Browsers**: Firefox and Safari may have issues with self-signed certificates in development
- **Certificate Warning**: When accessing the application in Chrome, you'll need to accept the self-signed certificate warning (click "Advanced" -> "Proceed to localhost")

### Setup Options

We provide both automated and manual setup options. Choose the one that suits you best.

#### Automated Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/open-factory-assistant.git
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

   The setup script will:
   - Create necessary environment files
   - Check Python and Node.js installations
   - Set up a Python virtual environment
   - Install Python requirements
   - Install npm dependencies
   - Configure environment variables

#### Manual Setup

If you prefer manual setup, follow the steps below:

### Backend Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/open-factory-assistant.git
   cd open-factory-assistant
   ```

2. Set up Python virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   # Make sure to set HTTPS=true and update SSL certificate paths
   ```

4. Start the backend server:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile=key.pem --ssl-certfile=cert.pem
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   # Make sure to set HTTPS=true and update SSL certificate paths
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Scanner Setup

1. Navigate to the scanner directory:

   ```bash
   cd scanner
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the scanner:

   ```bash
   cp config.example.json config.json
   # Edit config.json with your settings
   # Make sure to set HTTPS=true and update SSL certificate paths
   ```

4. Start the scanner application:
   ```bash
   npm start
   ```

### Enabling Mobile Device Access (Windows)

To access the scanner from mobile devices on your local network:

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

Note: These steps are for development environments only. For production deployments, proper security measures should be implemented.

## Configuration

### Environment Variables

[TODO: Add detailed list of all environment variables and their descriptions]

### Security Configuration

- CORS settings
- Rate limiting parameters
- Token expiration times
- [TODO: Add more security configuration options]

## Documentation

For detailed documentation, please visit our [Wiki](TODO: Add wiki link).

## Contributing

We welcome contributions! Please see our [Contributing Guide](TODO: Add contributing guide) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

[TODO: Add support channels and contact information]

## Acknowledgments

[TODO: Add acknowledgments for contributors and third-party libraries]
