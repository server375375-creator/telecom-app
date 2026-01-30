from sqlalchemy import Column, Integer, Text, TIMESTAMP, text
from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(Text, nullable=False, server_default=text("'technician'"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
