"""
Logging configuration for OpenFactoryAssistant backend.
Implements a comprehensive logging system with file and console outputs.
"""

import logging
import logging.handlers
import platform
from pathlib import Path
from datetime import datetime

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Log file paths
ERROR_LOG = LOGS_DIR / "error.log"
INFO_LOG = LOGS_DIR / "info.log"
DEBUG_LOG = LOGS_DIR / "debug.log"

# Maximum log file size (10MB)
MAX_BYTES = 10 * 1024 * 1024
BACKUP_COUNT = 5

# Custom formatter with extra details
class DetailedFormatter(logging.Formatter):
    def format(self, record):
        record.hostname = platform.node()
        return super().format(record)

# Log format with detailed information
LOG_FORMAT = "%(asctime)s | %(hostname)s | %(levelname)s | %(module)s:%(lineno)d | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

def setup_logger():
    """Configure and set up the logging system."""
    # Create root logger
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)

    # Detailed formatter
    formatter = DetailedFormatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    # Error file handler (includes ERROR and CRITICAL)
    error_handler = logging.handlers.RotatingFileHandler(
        ERROR_LOG, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)

    # Info file handler (includes INFO and above)
    info_handler = logging.handlers.RotatingFileHandler(
        INFO_LOG, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT
    )
    info_handler.setLevel(logging.INFO)
    info_handler.setFormatter(formatter)

    # Debug file handler (includes all levels)
    debug_handler = logging.handlers.RotatingFileHandler(
        DEBUG_LOG, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT
    )
    debug_handler.setLevel(logging.DEBUG)
    debug_handler.setFormatter(formatter)

    # Console handler (for development)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    # Add all handlers to the logger
    logger.addHandler(error_handler)
    logger.addHandler(info_handler)
    logger.addHandler(debug_handler)
    logger.addHandler(console_handler)

    return logger

# Initialize logger
logger = setup_logger()
