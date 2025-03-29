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
    prefix="/assets",
    tags=["Assets"]
)

# TODO: Implement support for asset locations on the frontend (maybe sizing as well?)

@router.post("/", response_model=schemas.Asset)
def create_asset(
    asset: schemas.AssetCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new asset"""
    try:
        logger.info(f"User {current_user.username} creating new asset: {asset.model_dump()}")
        
        db_asset = models.Asset(**asset.model_dump())
        db.add(db_asset)
        db.commit()
        db.refresh(db_asset)
        
        logger.info(f"Asset created successfully: ID={db_asset.id}")
        return db_asset
    except Exception as e:
        logger.error(f"Error creating asset: {str(e)}")
        db.rollback()
        raise

@router.get("/", response_model=List[schemas.Asset])
def read_assets(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all assets with pagination"""
    try:
        logger.debug(f"User {current_user.username} requesting assets list (skip={skip}, limit={limit})")
        assets = db.query(models.Asset).offset(skip).limit(limit).all()
        logger.debug(f"Retrieved {len(assets)} assets")
        return assets
    except Exception as e:
        logger.error(f"Error retrieving assets list: {str(e)}")
        raise

@router.get("/{asset_id}", response_model=schemas.Asset)
def read_asset(
    asset_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific asset by ID"""
    try:
        logger.debug(f"User {current_user.username} requesting asset ID={asset_id}")
        asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if asset is None:
            logger.warning(f"Asset not found: ID={asset_id}")
            raise HTTPException(status_code=404, detail="Asset not found")
        return asset
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving asset ID={asset_id}: {str(e)}")
        raise

@router.get("/{asset_id}/current_jobs", response_model=List[schemas.Job])
def read_asset_current_jobs(
    asset_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all jobs currently at this asset (no departure time set)"""
    try:
        logger.debug(f"User {current_user.username} requesting current jobs for asset ID={asset_id}")
        current_jobs = (
            db.query(models.Job)
            .join(models.JobLocation)
            .filter(
                models.JobLocation.asset_id == asset_id,
                models.JobLocation.departure_time.is_(None)
            )
            .all()
        )
        logger.debug(f"Found {len(current_jobs)} current jobs for asset ID={asset_id}")
        return current_jobs
    except Exception as e:
        logger.error(f"Error retrieving current jobs for asset ID={asset_id}: {str(e)}")
        raise

@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete an asset"""
    try:
        logger.info(f"User {current_user.username} attempting to delete asset ID={asset_id}")
        
        # Check if asset has any current jobs
        current_jobs = (
            db.query(models.Job)
            .join(models.JobLocation)
            .filter(
                models.JobLocation.asset_id == asset_id,
                models.JobLocation.departure_time.is_(None)
            )
            .all()
        )
        
        if current_jobs:
            logger.warning(f"Cannot delete asset ID={asset_id}: Has {len(current_jobs)} active jobs")
            raise HTTPException(
                status_code=400,
                detail="Cannot delete asset with active jobs"
            )
        
        # Delete the asset
        result = db.query(models.Asset).filter(models.Asset.id == asset_id).delete()
        if result == 0:
            logger.warning(f"Asset not found for deletion: ID={asset_id}")
            raise HTTPException(status_code=404, detail="Asset not found")
            
        db.commit()
        logger.info(f"Asset ID={asset_id} deleted successfully")
        return {"message": "Asset deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting asset ID={asset_id}: {str(e)}")
        db.rollback()
        raise
