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

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from models import JobStatus
from datetime import timezone

def format_datetime(dt: datetime) -> str:
    """Format datetime to ISO format with UTC timezone"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    date_created: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: format_datetime
        }

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    date_created: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: format_datetime
        }

class AssetBase(BaseModel):
    name: str
    manufacturer: str
    model: str
    description: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class Asset(AssetBase):
    id: int
    date_created: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: format_datetime
        }

class JobLocationBase(BaseModel):
    job_id: int
    asset_id: int
    arrival_time: datetime
    departure_time: Optional[datetime] = None

class JobLocationCreate(JobLocationBase):
    pass

class JobLocation(JobLocationBase):
    id: int

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: format_datetime
        }

class JobBase(BaseModel):
    name: str
    description: Optional[str] = None
    customer_id: int
    due_date: Optional[datetime] = None

class JobCreate(JobBase):
    pass

class Job(JobBase):
    id: int
    status: JobStatus
    date_created: datetime
    locations: List[JobLocation] = []

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: format_datetime
        }

class JobWithCustomer(Job):
    customer: Customer

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: format_datetime
        }
