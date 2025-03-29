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

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import os
import traceback
from dotenv import load_dotenv

from routers import users, customers, jobs, assets, logs
import models, schemas
from database import engine, get_db
from auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from logger_config import logger

# Load environment variables
load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="OpenFactoryAssistant API",
    description="API for OpenFactoryAssistant",
    version="1.0.0"
)

# Configure CORS for local development
base_origins = [
    "https://localhost:3001",  
    "https://127.0.0.1:3001",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
]

# Add origins from environment variable
if os.getenv("CORS_ORIGINS"):
    base_origins.extend(origin.strip() for origin in os.getenv("CORS_ORIGINS").split(",") if origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=base_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  
    allow_headers=["*"],
)

# Configure trusted hosts
allowed_hosts = ["localhost", "127.0.0.1"]

# Add hosts from environment variable
if os.getenv("ADDITIONAL_HOSTS"):
    allowed_hosts.extend(host.strip() for host in os.getenv("ADDITIONAL_HOSTS").split(",") if host.strip())

# Add trusted hosts middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts
)

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Middleware to log all requests and responses"""
    start_time = datetime.now()
    
    # Get protocol and forwarded protocol (useful when behind a proxy)
    protocol = request.headers.get('x-forwarded-proto', 'http')
    
    # Log the incoming request with protocol information
    logger.info(
        f"Request started | {protocol.upper()} | {request.method} {request.url.path} | "
        f"Client: {request.client.host if request.client else 'Unknown'} | "
        f"TLS: {request.headers.get('x-forwarded-ssl', 'N/A')} | "
        f"Cipher: {request.headers.get('ssl-cipher', 'N/A')}"
    )
    
    try:
        response = await call_next(request)
        
        # Calculate request duration
        duration = datetime.now() - start_time
        
        # Log the response
        logger.info(
            f"Request completed | {protocol.upper()} | {request.method} {request.url.path} | "
            f"Status: {response.status_code} | Duration: {duration.total_seconds():.3f}s"
        )
        
        return response
        
    except Exception as exc:
        # Log any unhandled exceptions
        logger.error(
            f"Request failed | {protocol.upper()} | {request.method} {request.url.path} | "
            f"Error: {str(exc)}\n{traceback.format_exc()}"
        )
        raise

# TODO: Replace with lifespan event handlers
@app.on_event("startup")
async def startup_event():
    """Log application startup"""
    logger.info("Application starting up")
    logger.info(f"CORS origins: {base_origins}")
    logger.info(f"Allowed hosts: {allowed_hosts}")

@app.on_event("shutdown")
async def shutdown_event():
    """Log application shutdown"""
    logger.info("Application shutting down")

# Error handler for database errors
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    error_details = {
        "detail": "An error occurred processing your request. Please try again.",
        "type": type(exc).__name__
    }
    
    # Log the full error with stack trace
    logger.error(
        f"Unhandled exception: {str(exc)}\n"
        f"Path: {request.url.path}\n"
        f"Method: {request.method}\n"
        f"Client: {request.client}\n"
        f"Stack trace: {traceback.format_exc()}"
    )
    
    return error_details

# Include routers
app.include_router(users.router)
app.include_router(customers.router)
app.include_router(jobs.router)
app.include_router(assets.router)
app.include_router(logs.router)

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Welcome to the OpenFactoryAssistant API", "version": "1.0.0"}

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    logger.info(f"Successful login for user: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}
