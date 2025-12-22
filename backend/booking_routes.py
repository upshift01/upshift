from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import uuid
import logging

from booking_models import (
    BookingCreate, BookingResponse, BookingStatus, TimeSlot,
    SA_PUBLIC_HOLIDAYS, AVAILABLE_TIMES, BOOKING_PRICE_CENTS
)
from auth import UserResponse

logger = logging.getLogger(__name__)

booking_router = APIRouter(prefix="/api/booking", tags=["Booking"])

# Dependency to get DB - will be set from server.py
db = None

def set_db(database):
    global db
    db = database


async def get_current_user_for_booking(request):
    """Get current user from auth"""
    from auth import get_current_user, oauth2_scheme
    token = await oauth2_scheme(request)
    user = await get_current_user(token, db)
    return user


def is_business_day(date_str: str) -> bool:
    """Check if date is a business day (Mon-Fri, not a holiday)"""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        # Check if weekend (0=Monday, 6=Sunday)
        if dt.weekday() >= 5:
            return False
        # Check if public holiday
        if date_str in SA_PUBLIC_HOLIDAYS:
            return False
        return True
    except:
        return False


def is_slot_in_past(date_str: str, time_str: str) -> bool:
    """Check if a slot is in the past"""
    try:
        slot_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        # Add timezone awareness (assume SAST = UTC+2)
        now = datetime.now(timezone.utc) + timedelta(hours=2)
        return slot_dt < now.replace(tzinfo=None)
    except:
        return True


@booking_router.get("/available-slots", response_model=dict)
async def get_available_slots(
    start_date: Optional[str] = None,
    days: int = 14
):
    """
    Get available booking slots for the next N days.
    Returns dates with available time slots.
    """
    try:
        if not start_date:
            start_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        available_slots = []
        
        for i in range(days):
            current_date = start_dt + timedelta(days=i)
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Skip weekends and holidays
            if not is_business_day(date_str):
                continue
            
            # Get existing bookings for this date
            existing_bookings = await db.bookings.find(
                {"date": date_str, "status": {"$ne": "cancelled"}},
                {"_id": 0, "time": 1}
            ).to_list(100)
            
            booked_times = {b["time"] for b in existing_bookings}
            
            # Get available times for this date
            day_slots = []
            for time_slot in AVAILABLE_TIMES:
                if time_slot not in booked_times and not is_slot_in_past(date_str, time_slot):
                    day_slots.append({
                        "time": time_slot,
                        "available": True
                    })
            
            if day_slots:
                available_slots.append({
                    "date": date_str,
                    "day_name": current_date.strftime("%A"),
                    "slots": day_slots
                })
        
        return {
            "start_date": start_date,
            "days": days,
            "available_dates": available_slots,
            "price_cents": BOOKING_PRICE_CENTS,
            "price_formatted": f"R {BOOKING_PRICE_CENTS / 100:.2f}",
            "duration_minutes": 30
        }
    except Exception as e:
        logger.error(f"Error getting available slots: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@booking_router.get("/holidays", response_model=dict)
async def get_holidays():
    """Get list of South African public holidays"""
    return {
        "holidays": SA_PUBLIC_HOLIDAYS,
        "country": "South Africa"
    }


@booking_router.post("/create", response_model=dict)
async def create_booking(
    booking: BookingCreate,
    request = None
):
    """
    Create a new booking.
    - Elite users: booking is included (free)
    - Other users: requires payment (R699)
    """
    from fastapi import Request
    try:
        # Try to get current user (optional - can book without login for addon)
        user = None
        user_tier = None
        
        try:
            from auth import oauth2_scheme, get_current_user
            if request:
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    user = await get_current_user(token, db)
                    user_doc = await db.users.find_one({"id": user.id})
                    user_tier = user_doc.get("active_tier") if user_doc else None
        except:
            pass
        
        # Validate date and time
        if not is_business_day(booking.date):
            raise HTTPException(
                status_code=400,
                detail="Selected date is not a business day or is a public holiday"
            )
        
        if booking.time not in AVAILABLE_TIMES:
            raise HTTPException(
                status_code=400,
                detail="Invalid time slot selected"
            )
        
        if is_slot_in_past(booking.date, booking.time):
            raise HTTPException(
                status_code=400,
                detail="Cannot book a slot in the past"
            )
        
        # Check if slot is already booked
        existing = await db.bookings.find_one({
            "date": booking.date,
            "time": booking.time,
            "status": {"$ne": "cancelled"}
        })
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="This time slot is no longer available"
            )
        
        # Determine if booking is included or paid addon
        is_elite = user_tier == "tier-3"
        payment_type = "included" if is_elite else "addon"
        is_paid = is_elite  # Elite users don't need to pay
        
        booking_id = str(uuid.uuid4())
        
        new_booking = {
            "id": booking_id,
            "user_id": user.id if user else None,
            "date": booking.date,
            "time": booking.time,
            "duration_minutes": 30,
            "name": booking.name,
            "email": booking.email,
            "phone": booking.phone,
            "topic": booking.topic,
            "notes": booking.notes,
            "status": BookingStatus.CONFIRMED if is_elite else BookingStatus.PENDING,
            "is_paid": is_paid,
            "payment_type": payment_type,
            "amount_cents": 0 if is_elite else BOOKING_PRICE_CENTS,
            "created_at": datetime.now(timezone.utc),
            "meeting_link": None  # Will be added after confirmation
        }
        
        await db.bookings.insert_one(new_booking)
        
        logger.info(f"Booking created: {booking_id} for {booking.date} {booking.time}")
        
        return {
            "success": True,
            "booking_id": booking_id,
            "status": new_booking["status"],
            "is_paid": is_paid,
            "payment_required": not is_paid,
            "amount_cents": new_booking["amount_cents"],
            "message": "Booking confirmed!" if is_elite else "Booking created. Payment required to confirm."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@booking_router.post("/{booking_id}/pay", response_model=dict)
async def pay_for_booking(booking_id: str):
    """
    Create payment checkout for a booking.
    """
    try:
        from yoco_service import yoco_service
        import os
        
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking["is_paid"]:
            raise HTTPException(status_code=400, detail="Booking is already paid")
        
        if booking["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Booking has been cancelled")
        
        # Create Yoco checkout
        checkout = await yoco_service.create_checkout(
            amount_cents=booking["amount_cents"],
            email=booking["email"],
            metadata={
                "booking_id": booking_id,
                "type": "strategy_call",
                "date": booking["date"],
                "time": booking["time"]
            }
        )
        
        # Store checkout ID
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"yoco_checkout_id": checkout.get("id")}}
        )
        
        logger.info(f"Payment checkout created for booking {booking_id}")
        
        return {
            "checkout_id": checkout.get("id"),
            "redirect_url": checkout.get("redirectUrl"),
            "booking_id": booking_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating booking payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@booking_router.post("/{booking_id}/confirm-payment", response_model=dict)
async def confirm_booking_payment(
    booking_id: str,
    checkout_id: Optional[str] = None
):
    """
    Confirm payment and activate booking.
    """
    try:
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # For demo purposes, we'll confirm without actual Yoco verification
        # In production, verify with Yoco API
        
        # Generate a meeting link (placeholder)
        meeting_link = f"https://meet.upshift.works/strategy-call/{booking_id[:8]}"
        
        await db.bookings.update_one(
            {"id": booking_id},
            {
                "$set": {
                    "is_paid": True,
                    "status": BookingStatus.CONFIRMED,
                    "meeting_link": meeting_link,
                    "paid_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Booking confirmed: {booking_id}")
        
        return {
            "success": True,
            "booking_id": booking_id,
            "status": "confirmed",
            "meeting_link": meeting_link,
            "message": "Payment confirmed! Your strategy call is booked."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@booking_router.get("/my-bookings", response_model=dict)
async def get_my_bookings(request):
    """
    Get current user's bookings.
    """
    try:
        user = await get_current_user_for_booking(request)
        
        bookings = await db.bookings.find(
            {"user_id": user.id},
            {"_id": 0}
        ).sort("date", -1).to_list(50)
        
        return {
            "bookings": bookings,
            "total": len(bookings)
        }
    except Exception as e:
        logger.error(f"Error getting bookings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@booking_router.get("/{booking_id}", response_model=dict)
async def get_booking(booking_id: str):
    """
    Get a specific booking by ID.
    """
    try:
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        return booking
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@booking_router.post("/{booking_id}/cancel", response_model=dict)
async def cancel_booking(booking_id: str, request):
    """
    Cancel a booking.
    """
    try:
        user = await get_current_user_for_booking(request)
        
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Check if user owns the booking
        if booking.get("user_id") != user.id:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
        
        if booking["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Booking is already cancelled")
        
        await db.bookings.update_one(
            {"id": booking_id},
            {
                "$set": {
                    "status": BookingStatus.CANCELLED,
                    "cancelled_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Booking cancelled: {booking_id}")
        
        return {
            "success": True,
            "message": "Booking cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling booking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
