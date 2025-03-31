'''
OpenFactoryAssistant

This file is part of OpenFactoryAssistant.

OpenFactoryAssistant is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

OpenFactoryAssistant is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with OpenFactoryAssistant. If not, see <https://www.gnu.org/licenses/>
'''

import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Get the project root directory (one level up from backend)
    project_root = Path(__file__).parent.parent
    
    # Set up SSL certificate paths using pathlib for cross-platform compatibility
    cert_dir = project_root / "certs"
    ssl_keyfile = cert_dir / os.getenv("CERT_KEY", "localhost-key.pem")
    ssl_certfile = cert_dir / os.getenv("CERT_CERT", "localhost.pem")
    
    # Create certs directory if it doesn't exist
    cert_dir.mkdir(exist_ok=True)
    
    # Ensure certificate files exist
    if not ssl_keyfile.exists() or not ssl_certfile.exists():
        raise FileNotFoundError(
            f"SSL certificate files not found. Ensure they exist in: {cert_dir}"
        )
    
    # Get host from environment or default to localhost
    host = os.getenv("HOST", "localhost")
    port = os.getenv("PORT", 8000)
    
    # Run the server with SSL
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        ssl_keyfile=str(ssl_keyfile),
        ssl_certfile=str(ssl_certfile),
        reload=True
    )
