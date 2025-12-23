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
        from yoco_service import get_yoco_service_for_reseller
        import os
        
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking["is_paid"]:
            raise HTTPException(status_code=400, detail="Booking is already paid")
        
        if booking["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Booking has been cancelled")
        
        # Get Yoco service from platform settings (not env vars)
        yoco = await get_yoco_service_for_reseller(db, reseller_id=None)
        
        if not yoco.is_configured():
            raise HTTPException(
                status_code=400, 
                detail="Payment is not configured. Please contact support."
            )
        
        frontend_url = os.environ.get('FRONTEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000'))
        
        # Create Yoco checkout
        checkout = await yoco.create_checkout(
            amount_cents=booking["amount_cents"],
            email=booking["email"],
            metadata={
                "booking_id": booking_id,
                "type": "strategy_call",
                "date": booking["date"],
                "time": booking["time"]
            },
            success_url=f"{frontend_url}/payment/success?booking={booking_id}",
            cancel_url=f"{frontend_url}/payment/cancel?booking={booking_id}"
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
    Confirm payment and activate booking, then send confirmation email.
    """
    try:
        from email_service import email_service
        
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Check if already paid to avoid duplicate emails
        if booking.get("is_paid"):
            return {
                "success": True,
                "booking_id": booking_id,
                "status": "confirmed",
                "meeting_link": booking.get("meeting_link"),
                "message": "Booking was already confirmed."
            }
        
        # Generate a meeting link (placeholder - in production integrate with Zoom/Google Meet)
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
        
        # Send confirmation email
        email_sent = False
        email_error_msg = None
        try:
            # Get email settings from platform
            email_settings = await db.platform_settings.find_one({"key": "email"}, {"_id": 0})
            if email_settings and email_settings.get("smtp_host"):
                email_service.configure(email_settings)
                
                # Format amount
                amount_rands = booking.get("amount_cents", 0) / 100
                amount_formatted = f"R {amount_rands:,.2f}"
                
                # Get customer name from booking
                customer_name = booking.get("name", booking.get("email", "Customer"))
                
                # Send confirmation email
                email_sent = await email_service.send_booking_confirmation(
                    to_email=booking["email"],
                    customer_name=customer_name,
                    booking_date=booking.get("date", "TBD"),
                    booking_time=booking.get("time", "TBD"),
                    meeting_link=meeting_link,
                    amount=amount_formatted,
                    company_name="UpShift"
                )
                
                # Log the email to email_logs collection
                import uuid
                await db.email_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "type": "booking_confirmation",
                    "to_email": booking["email"],
                    "from_email": email_settings.get("from_email", email_settings.get("smtp_user")),
                    "subject": "Your Strategy Call is Confirmed! - UpShift",
                    "status": "sent" if email_sent else "failed",
                    "error": None if email_sent else "Failed to send",
                    "sent_at": datetime.now(timezone.utc),
                    "booking_id": booking_id,
                    "smtp_host": email_settings.get("smtp_host")
                })
                
                if email_sent:
                    logger.info(f"Confirmation email sent to {booking['email']} for booking {booking_id}")
                else:
                    logger.warning(f"Failed to send confirmation email for booking {booking_id}")
            else:
                email_error_msg = "Email settings not configured"
                logger.warning(f"Email settings not configured, skipping confirmation email for booking {booking_id}")
        except Exception as email_error:
            email_error_msg = str(email_error)
            logger.error(f"Error sending confirmation email: {str(email_error)}")
        
        return {
            "success": True,
            "booking_id": booking_id,
            "status": "confirmed",
            "meeting_link": meeting_link,
            "email_sent": email_sent,
            "email_error": email_error_msg if not email_sent else None,
            "message": "Payment confirmed! Your strategy call is booked." + (" Confirmation email sent." if email_sent else "")
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
