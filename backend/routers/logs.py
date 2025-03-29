"""
OpenFactoryAssistant - Frontend and Scanner Log Router

This module handles frontend and scanner log collection and storage.
"""

import logging
from logging.handlers import RotatingFileHandler
import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_active_user
import models

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Setup logger for frontend logs
frontend_logger = logging.getLogger('frontend')
frontend_logger.setLevel(logging.DEBUG)

# Configure rotating file handler for frontend logs
frontend_handler = RotatingFileHandler(
    filename='logs/frontend.log',
    maxBytes=10 * 1024 * 1024,  # 10MB per file
    backupCount=5,  # Keep 5 backup files
    encoding='utf-8'
)
frontend_handler.setFormatter(
    logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
)
frontend_logger.addHandler(frontend_handler)

# Setup logger for scanner logs
scanner_logger = logging.getLogger('scanner')
scanner_logger.setLevel(logging.DEBUG)

# Configure rotating file handler for scanner logs
scanner_handler = RotatingFileHandler(
    filename='logs/scanner.log',
    maxBytes=10 * 1024 * 1024,  # 10MB per file
    backupCount=5,  # Keep 5 backup files
    encoding='utf-8'
)
scanner_handler.setFormatter(
    logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
)
scanner_logger.addHandler(scanner_handler)

router = APIRouter(
    prefix="/logs",
    tags=["logs"],
)

class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    context: dict = {}

class LogBatch(BaseModel):
    logs: List[LogEntry]

@router.post("/frontend")
async def store_frontend_logs(
    log_batch: LogBatch,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Store frontend logs in rotating log files."""
    for log in log_batch.logs:
        # Add user context
        context = {
            **log.context,
            "user_id": current_user.id,
            "username": current_user.username
        }
        
        # Map frontend levels to Python logging levels
        level_map = {
            "ERROR": logging.ERROR,
            "WARN": logging.WARNING,
            "INFO": logging.INFO,
            "DEBUG": logging.DEBUG
        }
        
        level = level_map.get(log.level, logging.INFO)
        
        # Format the message with context
        message = f"{log.message} | Context: {context}"
        
        # Log using the appropriate level
        frontend_logger.log(level, message)
    
    return {"status": "success", "message": f"Stored {len(log_batch.logs)} log entries"}

@router.post("/scanner")
async def store_scanner_logs(
    log_batch: LogBatch,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Store scanner logs in rotating log files."""
    for log in log_batch.logs:
        # Add user context
        context = {
            **log.context,
            "user_id": current_user.id,
            "username": current_user.username
        }
        
        # Map scanner levels to Python logging levels
        level_map = {
            "ERROR": logging.ERROR,
            "WARN": logging.WARNING,
            "INFO": logging.INFO,
            "DEBUG": logging.DEBUG
        }
        
        level = level_map.get(log.level, logging.INFO)
        
        # Format the message with context
        message = f"{log.message} | Context: {context}"
        
        # Log using the appropriate level
        scanner_logger.log(level, message)
    
    return {"status": "success", "message": f"Stored {len(log_batch.logs)} log entries"}
