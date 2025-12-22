from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, time
from enum import Enum

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class TimeSlot(BaseModel):
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    available: bool = True

class BookingCreate(BaseModel):
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    name: str
    email: str
    phone: Optional[str] = None
    topic: Optional[str] = None
    notes: Optional[str] = None

class BookingResponse(BaseModel):
    id: str
    user_id: str
    date: str
    time: str
    duration_minutes: int = 30
    name: str
    email: str
    phone: Optional[str] = None
    topic: Optional[str] = None
    notes: Optional[str] = None
    status: BookingStatus
    is_paid: bool
    payment_type: str  # "included" (Elite) or "addon"
    amount_cents: Optional[int] = None
    created_at: datetime
    meeting_link: Optional[str] = None

# South African Public Holidays 2024-2025
SA_PUBLIC_HOLIDAYS = [
    # 2024
    "2024-01-01",  # New Year's Day
    "2024-03-21",  # Human Rights Day
    "2024-03-29",  # Good Friday
    "2024-04-01",  # Family Day
    "2024-04-27",  # Freedom Day
    "2024-05-01",  # Workers' Day
    "2024-06-16",  # Youth Day
    "2024-06-17",  # Youth Day (observed)
    "2024-08-09",  # National Women's Day
    "2024-09-24",  # Heritage Day
    "2024-12-16",  # Day of Reconciliation
    "2024-12-25",  # Christmas Day
    "2024-12-26",  # Day of Goodwill
    # 2025
    "2025-01-01",  # New Year's Day
    "2025-03-21",  # Human Rights Day
    "2025-04-18",  # Good Friday
    "2025-04-21",  # Family Day
    "2025-04-27",  # Freedom Day
    "2025-04-28",  # Freedom Day (observed)
    "2025-05-01",  # Workers' Day
    "2025-06-16",  # Youth Day
    "2025-08-09",  # National Women's Day
    "2025-09-24",  # Heritage Day
    "2025-12-16",  # Day of Reconciliation
    "2025-12-25",  # Christmas Day
    "2025-12-26",  # Day of Goodwill
    # 2026
    "2026-01-01",  # New Year's Day
    "2026-03-21",  # Human Rights Day
    "2026-04-03",  # Good Friday
    "2026-04-06",  # Family Day
    "2026-04-27",  # Freedom Day
    "2026-05-01",  # Workers' Day
    "2026-06-16",  # Youth Day
    "2026-08-09",  # National Women's Day
    "2026-08-10",  # Women's Day (observed)
    "2026-09-24",  # Heritage Day
    "2026-12-16",  # Day of Reconciliation
    "2026-12-25",  # Christmas Day
    "2026-12-26",  # Day of Goodwill
]

# Available time slots (9 AM to 5 PM, 30-minute slots)
AVAILABLE_TIMES = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30"
]

BOOKING_PRICE_CENTS = 69900  # R699.00
