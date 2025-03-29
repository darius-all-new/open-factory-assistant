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

import schemas
import models
from database import get_db
from auth import get_current_active_user
from logger_config import logger

router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)

@router.post("/", response_model=schemas.Customer)
def create_customer(
    customer: schemas.CustomerCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new customer"""
    try:
        logger.info(f"User {current_user.username} creating new customer: {customer.model_dump(exclude={'password'})}")
        
        # Check for existing email
        db_customer = db.query(models.Customer).filter(models.Customer.email == customer.email).first()
        if db_customer:
            logger.warning(f"Customer creation failed: Email already registered - {customer.email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new customer
        db_customer = models.Customer(**customer.model_dump())
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        
        logger.info(f"Customer created successfully: ID={db_customer.id}, Email={db_customer.email}")
        return db_customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        db.rollback()
        raise

@router.get("/", response_model=List[schemas.Customer])
def read_customers(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all customers with pagination"""
    try:
        logger.debug(f"User {current_user.username} requesting customers list (skip={skip}, limit={limit})")
        customers = db.query(models.Customer).offset(skip).limit(limit).all()
        logger.debug(f"Retrieved {len(customers)} customers")
        return customers
    except Exception as e:
        logger.error(f"Error retrieving customers list: {str(e)}")
        raise

@router.get("/{customer_id}", response_model=schemas.Customer)
def read_customer(
    customer_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific customer by ID"""
    try:
        logger.debug(f"User {current_user.username} requesting customer ID={customer_id}")
        customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
        if customer is None:
            logger.warning(f"Customer not found: ID={customer_id}")
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving customer ID={customer_id}: {str(e)}")
        raise

@router.put("/{customer_id}", response_model=schemas.Customer)
def update_customer(
    customer_id: int,
    customer: schemas.CustomerCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a customer's information"""
    try:
        logger.info(f"User {current_user.username} updating customer ID={customer_id}")
        
        db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
        if db_customer is None:
            logger.warning(f"Customer not found for update: ID={customer_id}")
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Update customer fields
        update_data = customer.model_dump(exclude={'password'})
        logger.debug(f"Updating customer ID={customer_id} with data: {update_data}")
        
        for key, value in customer.model_dump().items():
            setattr(db_customer, key, value)
        
        db.commit()
        db.refresh(db_customer)
        
        logger.info(f"Customer ID={customer_id} updated successfully")
        return db_customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer ID={customer_id}: {str(e)}")
        db.rollback()
        raise

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a customer"""
    try:
        logger.info(f"User {current_user.username} attempting to delete customer ID={customer_id}")
        
        customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
        if customer is None:
            logger.warning(f"Customer not found for deletion: ID={customer_id}")
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # TODO: Add check for active jobs or other dependencies
        
        db.delete(customer)
        db.commit()
        
        logger.info(f"Customer ID={customer_id} deleted successfully")
        return {"message": "Customer deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting customer ID={customer_id}: {str(e)}")
        db.rollback()
        raise
