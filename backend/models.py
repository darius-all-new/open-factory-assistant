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

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import pytz
import enum

from database import Base

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    date_created = Column(DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC))

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    address = Column(String)
    date_created = Column(DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC))
    jobs = relationship("Job", back_populates="customer")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    manufacturer = Column(String)
    model = Column(String)
    description = Column(String)
    date_created = Column(DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC))
    job_locations = relationship("JobLocation", back_populates="asset")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    date_created = Column(DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC))
    due_date = Column(DateTime(timezone=True))
    
    customer = relationship("Customer", back_populates="jobs")
    locations = relationship("JobLocation", back_populates="job", order_by="JobLocation.arrival_time")

class JobLocation(Base):
    __tablename__ = "job_locations"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))
    arrival_time = Column(DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC))
    departure_time = Column(DateTime(timezone=True), nullable=True)
    
    job = relationship("Job", back_populates="locations")
    asset = relationship("Asset", back_populates="job_locations")
