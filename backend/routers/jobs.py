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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

import schemas
import models
from database import get_db
from auth import get_current_active_user
from logger_config import logger

router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"]
)

@router.post("/", response_model=schemas.Job)
def create_job(
    job: schemas.JobCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new job"""
    try:
        logger.info(f"User {current_user.username} creating new job for customer ID={job.customer_id}")
        
        # Verify customer exists
        customer = db.query(models.Customer).filter(models.Customer.id == job.customer_id).first()
        if not customer:
            logger.warning(f"Job creation failed: Customer not found - ID={job.customer_id}")
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Create job
        db_job = models.Job(**job.model_dump())
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        
        logger.info(f"Job created successfully: ID={db_job.id}, Customer={customer.name}, Status={db_job.status}")
        return db_job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        db.rollback()
        raise

@router.get("/", response_model=List[schemas.JobWithCustomer])
def read_jobs(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all jobs with pagination"""
    try:
        logger.debug(f"User {current_user.username} requesting jobs list (skip={skip}, limit={limit})")
        jobs = db.query(models.Job).offset(skip).limit(limit).all()
        logger.debug(f"Retrieved {len(jobs)} jobs")
        return jobs
    except Exception as e:
        logger.error(f"Error retrieving jobs list: {str(e)}")
        raise

@router.get("/{job_id}", response_model=schemas.JobWithCustomer)
def read_job(
    job_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific job by ID"""
    try:
        logger.debug(f"User {current_user.username} requesting job ID={job_id}")
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if job is None:
            logger.warning(f"Job not found: ID={job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving job ID={job_id}: {str(e)}")
        raise

@router.post("/{job_id}/move", response_model=schemas.Job)
def move_job_to_asset(
    job_id: int,
    asset_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Move a job to a new asset, recording the movement time"""
    try:
        logger.info(f"User {current_user.username} moving job ID={job_id} to asset ID={asset_id}")
        
        # Verify job exists
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            logger.warning(f"Job not found for move operation: ID={job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Verify asset exists
        asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if not asset:
            logger.warning(f"Asset not found for move operation: ID={asset_id}")
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Check current location
        current_location = (
            db.query(models.JobLocation)
            .filter(
                models.JobLocation.job_id == job_id,
                models.JobLocation.departure_time.is_(None)
            )
            .first()
        )
        
        # If job is currently at a location, set its departure time
        if current_location:
            logger.debug(f"Setting departure time for job ID={job_id} from asset ID={current_location.asset_id}")
            current_location.departure_time = datetime.utcnow()
        
        # Create new location record
        new_location = models.JobLocation(
            job_id=job_id,
            asset_id=asset_id,
            arrival_time=datetime.utcnow()
        )
        db.add(new_location)
        
        # Update job status to in_progress when moved to an asset
        job.status = models.JobStatus.IN_PROGRESS
        
        db.commit()
        db.refresh(job)
        
        logger.info(f"Job ID={job_id} successfully moved to asset ID={asset_id}")
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving job ID={job_id} to asset ID={asset_id}: {str(e)}")
        db.rollback()
        raise

@router.post("/{job_id}/status", response_model=schemas.Job)
def update_job_status(
    job_id: int,
    status: models.JobStatus,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update job status"""
    try:
        logger.info(f"User {current_user.username} updating status of job ID={job_id} to {status}")
        
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            logger.warning(f"Job not found for status update: ID={job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        old_status = job.status
        
        # If marking as complete, ensure all locations have departure times
        if status == models.JobStatus.COMPLETE:
            current_location = (
                db.query(models.JobLocation)
                .filter(
                    models.JobLocation.job_id == job_id,
                    models.JobLocation.departure_time.is_(None)
                )
                .first()
            )
            if current_location:
                logger.debug(f"Setting departure time for completed job ID={job_id} from asset ID={current_location.asset_id}")
                current_location.departure_time = datetime.utcnow()
        
        # If marking as pending, ensure job is not at any location
        if status == models.JobStatus.PENDING:
            current_location = (
                db.query(models.JobLocation)
                .filter(
                    models.JobLocation.job_id == job_id,
                    models.JobLocation.departure_time.is_(None)
                )
                .first()
            )
            if current_location:
                logger.debug(f"Setting departure time for pending job ID={job_id} from asset ID={current_location.asset_id}")
                current_location.departure_time = datetime.utcnow()
        
        job.status = status
        db.commit()
        db.refresh(job)
        
        logger.info(f"Job ID={job_id} status updated: {old_status} -> {status}")
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating status of job ID={job_id}: {str(e)}")
        db.rollback()
        raise

@router.get("/{job_id}/location_history", response_model=List[schemas.JobLocation])
def get_job_location_history(
    job_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get the complete location history of a job"""
    try:
        logger.debug(f"User {current_user.username} requesting location history for job ID={job_id}")
        
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            logger.warning(f"Job not found for location history: ID={job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        locations = (
            db.query(models.JobLocation)
            .filter(models.JobLocation.job_id == job_id)
            .order_by(models.JobLocation.arrival_time)
            .all()
        )
        
        logger.debug(f"Retrieved {len(locations)} location records for job ID={job_id}")
        return locations
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving location history for job ID={job_id}: {str(e)}")
        raise
