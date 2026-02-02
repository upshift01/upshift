"""
Contracts Routes - API endpoints for Contract Management
Handles contract creation, management, and milestone tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import logging
import os
import io

from email_service import email_service
from websocket_service import create_notification

logger = logging.getLogger(__name__)

contracts_router = APIRouter(prefix="/api/contracts", tags=["Contracts"])

# Pydantic Models
class ContractCreate(BaseModel):
    proposal_id: str
    title: str
    description: Optional[str] = None
    start_date: str  # ISO format
    end_date: Optional[str] = None  # ISO format, None for ongoing
    payment_amount: float
    payment_currency: str = "USD"
    payment_type: str = "fixed"  # fixed, hourly, monthly
    payment_schedule: str = "on_completion"  # on_completion, weekly, bi-weekly, monthly
    milestones: List[dict] = []  # [{title, description, amount, due_date}]
    terms: Optional[str] = None
    # New comprehensive fields
    scope_of_work: Optional[str] = None
    deliverables: List[str] = []
    payment_terms: Optional[str] = None
    confidentiality_clause: Optional[str] = None
    termination_conditions: Optional[str] = None
    dispute_resolution: Optional[str] = None
    intellectual_property: Optional[str] = None

class ContractUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    terms: Optional[str] = None
    status: Optional[str] = None
    scope_of_work: Optional[str] = None
    deliverables: Optional[List[str]] = None
    payment_terms: Optional[str] = None
    confidentiality_clause: Optional[str] = None
    termination_conditions: Optional[str] = None
    dispute_resolution: Optional[str] = None
    intellectual_property: Optional[str] = None

class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    due_date: Optional[str] = None

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None  # pending, in_progress, submitted, approved, paid


def get_contracts_routes(db, get_current_user):
    """Factory function to create contracts routes with database dependency"""
    
    # ==================== CONTRACT CRUD ====================
    
    @contracts_router.post("")
    async def create_contract(
        data: ContractCreate,
        current_user = Depends(get_current_user)
    ):
        """Create a contract from an accepted proposal (employer only)"""
        try:
            # Get the proposal
            proposal = await db.proposals.find_one({"id": data.proposal_id})
            if not proposal:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            # Verify current user is the employer
            if proposal.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only the employer can create a contract")
            
            # Check proposal status
            if proposal.get("status") != "accepted":
                raise HTTPException(status_code=400, detail="Can only create contract for accepted proposals")
            
            # Check if contract already exists for this proposal
            existing = await db.contracts.find_one({"proposal_id": data.proposal_id})
            if existing:
                raise HTTPException(status_code=400, detail="Contract already exists for this proposal")
            
            # Get job details
            job = await db.remote_jobs.find_one({"id": proposal.get("job_id")})
            
            # Create milestones if provided
            milestones = []
            for i, m in enumerate(data.milestones):
                milestones.append({
                    "id": str(uuid.uuid4()),
                    "order": i + 1,
                    "title": m.get("title"),
                    "description": m.get("description"),
                    "amount": m.get("amount", 0),
                    "due_date": m.get("due_date"),
                    "status": "pending",
                    "submitted_at": None,
                    "approved_at": None,
                    "paid_at": None
                })
            
            contract = {
                "id": str(uuid.uuid4()),
                "proposal_id": data.proposal_id,
                "job_id": proposal.get("job_id"),
                "job_title": proposal.get("job_title") or job.get("title") if job else "Unknown",
                
                # Parties
                "employer_id": current_user.id,
                "employer_name": current_user.full_name or current_user.email,
                "employer_email": current_user.email,
                "company_name": job.get("company_name") if job else None,
                
                "contractor_id": proposal.get("applicant_id"),
                "contractor_name": proposal.get("applicant_name"),
                "contractor_email": proposal.get("applicant_email"),
                
                # Contract details
                "title": data.title,
                "description": data.description,
                "start_date": data.start_date,
                "end_date": data.end_date,
                
                # Comprehensive contract fields
                "scope_of_work": data.scope_of_work,
                "deliverables": data.deliverables or [],
                "payment_terms": data.payment_terms,
                "confidentiality_clause": data.confidentiality_clause,
                "termination_conditions": data.termination_conditions,
                "dispute_resolution": data.dispute_resolution,
                "intellectual_property": data.intellectual_property,
                
                # Payment
                "payment_amount": data.payment_amount,
                "payment_currency": data.payment_currency,
                "payment_type": data.payment_type,
                "payment_schedule": data.payment_schedule,
                "total_paid": 0,
                
                # Milestones
                "milestones": milestones,
                "has_milestones": len(milestones) > 0,
                
                # Terms
                "terms": data.terms,
                
                # Signatures
                "employer_signature": None,
                "employer_signed_at": None,
                "contractor_signature": None,
                "contractor_signed_at": None,
                
                # Status
                "status": "draft",  # draft, active, completed, cancelled, disputed
                "contractor_signed": False,
                "employer_signed": True,  # Employer creates it, so they've agreed
                
                # Timestamps
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "activated_at": None,
                "completed_at": None
            }
            
            await db.contracts.insert_one(contract)
            contract.pop("_id", None)
            
            # Update job status to 'filled' when contract is created
            await db.remote_jobs.update_one(
                {"id": proposal.get("job_id")},
                {"$set": {
                    "status": "filled",
                    "filled_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Contract created: {contract['id']} for proposal {data.proposal_id}")
            
            # Send email notification to contractor
            try:
                frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
                if frontend_url:
                    contract_url = f"{frontend_url}/contracts/{contract['id']}"
                else:
                    contract_url = f"/contracts/{contract['id']}"
                
                await email_service.send_contract_created_email(
                    to_email=contract["contractor_email"],
                    contractor_name=contract["contractor_name"],
                    contract_title=contract["title"],
                    employer_name=contract["employer_name"],
                    company_name=contract.get("company_name") or "Not specified",
                    contract_value=f"{contract['payment_currency']} {contract['payment_amount']:,.2f}",
                    start_date=contract["start_date"][:10] if contract["start_date"] else "TBD",
                    contract_url=contract_url
                )
                logger.info(f"Contract creation email sent to {contract['contractor_email']}")
                
                # Send real-time notification to contractor
                await create_notification(
                    db=db,
                    user_id=contract["contractor_id"],
                    notification_type="contract_created",
                    title="New Contract Offer",
                    message=f"{contract['employer_name']} has offered you a contract: {contract['title']}",
                    link=f"/contracts/{contract['id']}",
                    metadata={
                        "contract_id": contract["id"],
                        "contract_title": contract["title"],
                        "employer_name": contract["employer_name"],
                        "value": contract["payment_amount"]
                    }
                )
            except Exception as email_err:
                logger.warning(f"Failed to send contract creation notification: {email_err}")
            
            return {"success": True, "message": "Contract created", "contract": contract}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.get("/my-contracts")
    async def get_my_contracts(
        current_user = Depends(get_current_user),
        role: Optional[str] = Query(None),  # employer, contractor
        status: Optional[str] = Query(None)
    ):
        """Get contracts where user is employer or contractor"""
        try:
            # Build query - user can be either party
            if role == "employer":
                query = {"employer_id": current_user.id}
            elif role == "contractor":
                query = {"contractor_id": current_user.id}
            else:
                query = {
                    "$or": [
                        {"employer_id": current_user.id},
                        {"contractor_id": current_user.id}
                    ]
                }
            
            if status:
                query["status"] = status
            
            contracts = await db.contracts.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=100)
            
            # Add role info to each contract
            for c in contracts:
                c["user_role"] = "employer" if c.get("employer_id") == current_user.id else "contractor"
            
            return {"success": True, "contracts": contracts}
            
        except Exception as e:
            logger.error(f"Error getting contracts: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.get("/check-proposal/{proposal_id}")
    async def check_contract_exists_for_proposal(
        proposal_id: str,
        current_user = Depends(get_current_user)
    ):
        """Check if a contract already exists for a proposal"""
        try:
            contract = await db.contracts.find_one(
                {"proposal_id": proposal_id},
                {"_id": 0, "id": 1, "status": 1, "title": 1}
            )
            
            if contract:
                return {
                    "success": True,
                    "has_contract": True,
                    "contract": contract
                }
            
            return {
                "success": True,
                "has_contract": False,
                "contract": None
            }
            
        except Exception as e:
            logger.error(f"Error checking contract for proposal: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.get("/{contract_id}")
    async def get_contract_details(
        contract_id: str,
        current_user = Depends(get_current_user)
    ):
        """Get contract details"""
        try:
            contract = await db.contracts.find_one(
                {"id": contract_id},
                {"_id": 0}
            )
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Check access
            is_employer = contract.get("employer_id") == current_user.id
            is_contractor = contract.get("contractor_id") == current_user.id
            
            if not is_employer and not is_contractor:
                raise HTTPException(status_code=403, detail="Access denied")
            
            contract["user_role"] = "employer" if is_employer else "contractor"
            
            return {"success": True, "contract": contract}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.put("/{contract_id}")
    async def update_contract(
        contract_id: str,
        data: ContractUpdate,
        current_user = Depends(get_current_user)
    ):
        """Update contract (employer only, draft status only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can update contract")
            
            if contract.get("status") != "draft":
                raise HTTPException(status_code=400, detail="Can only update draft contracts")
            
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": update_data}
            )
            
            updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
            
            return {"success": True, "contract": updated}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== CONTRACT ACTIONS ====================
    
    @contracts_router.post("/{contract_id}/sign")
    async def sign_contract(
        contract_id: str,
        data: dict = None,
        current_user = Depends(get_current_user)
    ):
        """Sign/accept contract (contractor only) - uses saved signature from talent pool profile"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("contractor_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only contractor can sign")
            
            if contract.get("status") != "draft":
                raise HTTPException(status_code=400, detail="Contract is not in draft status")
            
            if contract.get("contractor_signed"):
                raise HTTPException(status_code=400, detail="Already signed")
            
            # Get contractor's signature from talent pool profile
            talent_profile = await db.talent_pool_profiles.find_one(
                {"user_id": current_user.id},
                {"_id": 0, "signature_url": 1}
            )
            
            contractor_signature = None
            if talent_profile and talent_profile.get("signature_url"):
                contractor_signature = talent_profile.get("signature_url")
            elif data and data.get("signature_data"):
                # Allow inline signature if not saved in profile
                contractor_signature = data.get("signature_data")
            
            if not contractor_signature:
                raise HTTPException(
                    status_code=400, 
                    detail="Please save your signature in your Talent Pool profile before signing contracts"
                )
            
            # Sign and activate contract
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "contractor_signed": True,
                    "contractor_signature": contractor_signature,
                    "contractor_signed_at": datetime.now(timezone.utc).isoformat(),
                    "status": "active",
                    "activated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Contract {contract_id} signed by contractor {current_user.email}")
            
            # Send email notifications to both parties
            try:
                frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "").replace("/api", "").rstrip("/")
                contract_url = f"{frontend_url}/contracts/{contract_id}" if frontend_url else f"/contracts/{contract_id}"
                
                # Notify employer
                await email_service.send_contract_signed_email(
                    to_email=contract.get("employer_email"),
                    recipient_name=contract.get("employer_name"),
                    contract_title=contract.get("title"),
                    other_party_name=contract.get("contractor_name"),
                    contract_url=contract_url
                )
                
                # Notify contractor (confirmation)
                await email_service.send_contract_signed_email(
                    to_email=contract.get("contractor_email"),
                    recipient_name=contract.get("contractor_name"),
                    contract_title=contract.get("title"),
                    other_party_name=contract.get("employer_name"),
                    contract_url=contract_url
                )
                logger.info(f"Contract signed emails sent for contract {contract_id}")
                
                # Send real-time notification to employer
                await create_notification(
                    db=db,
                    user_id=contract.get("employer_id"),
                    notification_type="contract_signed",
                    title="Contract Signed",
                    message=f"{contract.get('contractor_name')} has signed the contract: {contract.get('title')}",
                    link=f"/contracts/{contract_id}",
                    metadata={
                        "contract_id": contract_id,
                        "contract_title": contract.get("title"),
                        "contractor_name": contract.get("contractor_name")
                    }
                )
            except Exception as email_err:
                logger.warning(f"Failed to send contract signed notifications: {email_err}")
            
            return {"success": True, "message": "Contract signed and activated"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error signing contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/complete")
    async def complete_contract(
        contract_id: str,
        current_user = Depends(get_current_user)
    ):
        """Mark contract as completed (employer only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can complete contract")
            
            if contract.get("status") != "active":
                raise HTTPException(status_code=400, detail="Contract must be active to complete")
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "message": "Contract marked as completed"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error completing contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/cancel")
    async def cancel_contract(
        contract_id: str,
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """Cancel contract (either party, with reason)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            is_employer = contract.get("employer_id") == current_user.id
            is_contractor = contract.get("contractor_id") == current_user.id
            
            if not is_employer and not is_contractor:
                raise HTTPException(status_code=403, detail="Access denied")
            
            if contract.get("status") in ["completed", "cancelled"]:
                raise HTTPException(status_code=400, detail="Contract already finalized")
            
            reason = data.get("reason", "No reason provided")
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "status": "cancelled",
                    "cancelled_by": current_user.id,
                    "cancellation_reason": reason,
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "message": "Contract cancelled"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling contract: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== CONTRACT PDF GENERATION ====================
    
    @contracts_router.get("/{contract_id}/pdf")
    async def generate_contract_pdf(
        contract_id: str,
        current_user = Depends(get_current_user)
    ):
        """Generate PDF for signed contract"""
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
        import base64
        
        try:
            contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            # Check access
            if contract.get("employer_id") != current_user.id and contract.get("contractor_id") != current_user.id:
                if current_user.role != "super_admin":
                    raise HTTPException(status_code=403, detail="Access denied")
            
            # Create PDF buffer
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=1*inch,
                leftMargin=1*inch,
                topMargin=0.75*inch,
                bottomMargin=0.75*inch
            )
            
            # Styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=20,
                alignment=TA_CENTER,
                spaceAfter=20,
                textColor=colors.HexColor('#1e3a8a')
            )
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=14,
                spaceBefore=15,
                spaceAfter=10,
                textColor=colors.HexColor('#1e40af')
            )
            subheading_style = ParagraphStyle(
                'SubHeading',
                parent=styles['Heading3'],
                fontSize=12,
                spaceBefore=10,
                spaceAfter=5,
                textColor=colors.HexColor('#374151')
            )
            body_style = ParagraphStyle(
                'CustomBody',
                parent=styles['Normal'],
                fontSize=10,
                alignment=TA_JUSTIFY,
                spaceAfter=8,
                leading=14
            )
            label_style = ParagraphStyle(
                'Label',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280')
            )
            
            # Build document content
            content = []
            
            # Header
            content.append(Paragraph("CONTRACT AGREEMENT", title_style))
            content.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1e3a8a')))
            content.append(Spacer(1, 20))
            
            # Contract ID and Date
            contract_date = contract.get("created_at", "")[:10] if contract.get("created_at") else "N/A"
            content.append(Paragraph(f"<b>Contract ID:</b> {contract.get('id', 'N/A')}", label_style))
            content.append(Paragraph(f"<b>Date Created:</b> {contract_date}", label_style))
            content.append(Paragraph(f"<b>Status:</b> {contract.get('status', 'N/A').upper()}", label_style))
            content.append(Spacer(1, 15))
            
            # Parties Section
            content.append(Paragraph("PARTIES", heading_style))
            content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
            
            parties_data = [
                ["EMPLOYER", "CONTRACTOR"],
                [contract.get("employer_name", "N/A"), contract.get("contractor_name", "N/A")],
                [contract.get("company_name", "") or "", ""],
                [contract.get("employer_email", "N/A"), contract.get("contractor_email", "N/A")]
            ]
            parties_table = Table(parties_data, colWidths=[3*inch, 3*inch])
            parties_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            content.append(parties_table)
            content.append(Spacer(1, 15))
            
            # Contract Details
            content.append(Paragraph("CONTRACT DETAILS", heading_style))
            content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
            
            content.append(Paragraph(f"<b>Title:</b> {contract.get('title', 'N/A')}", body_style))
            
            if contract.get("description"):
                content.append(Paragraph(f"<b>Description:</b> {contract.get('description')}", body_style))
            
            start_date = contract.get("start_date", "N/A")[:10] if contract.get("start_date") else "N/A"
            end_date = contract.get("end_date", "Ongoing")[:10] if contract.get("end_date") else "Ongoing"
            content.append(Paragraph(f"<b>Duration:</b> {start_date} to {end_date}", body_style))
            content.append(Spacer(1, 10))
            
            # Payment Details
            content.append(Paragraph("PAYMENT DETAILS", heading_style))
            content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
            
            currency = contract.get("payment_currency", "USD")
            amount = contract.get("payment_amount", 0)
            content.append(Paragraph(f"<b>Total Contract Value:</b> {currency} {amount:,.2f}", body_style))
            content.append(Paragraph(f"<b>Payment Type:</b> {contract.get('payment_type', 'Fixed').title()}", body_style))
            content.append(Paragraph(f"<b>Payment Schedule:</b> {contract.get('payment_schedule', 'On Completion').replace('_', ' ').title()}", body_style))
            
            if contract.get("payment_terms"):
                content.append(Paragraph(f"<b>Payment Terms:</b> {contract.get('payment_terms')}", body_style))
            content.append(Spacer(1, 10))
            
            # Milestones
            milestones = contract.get("milestones", [])
            if milestones:
                content.append(Paragraph("PAYMENT MILESTONES", heading_style))
                content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
                
                milestone_data = [["#", "Milestone", "Amount", "Status"]]
                for i, m in enumerate(milestones, 1):
                    milestone_data.append([
                        str(i),
                        m.get("title", "N/A"),
                        f"{currency} {m.get('amount', 0):,.2f}",
                        m.get("status", "Pending").title()
                    ])
                
                milestone_table = Table(milestone_data, colWidths=[0.5*inch, 3*inch, 1.2*inch, 1*inch])
                milestone_table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                ]))
                content.append(milestone_table)
                content.append(Spacer(1, 10))
            
            # Scope of Work
            if contract.get("scope_of_work"):
                content.append(Paragraph("SCOPE OF WORK", heading_style))
                content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
                content.append(Paragraph(contract.get("scope_of_work"), body_style))
                content.append(Spacer(1, 10))
            
            # Deliverables
            deliverables = contract.get("deliverables", [])
            if deliverables:
                content.append(Paragraph("DELIVERABLES", heading_style))
                content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
                for i, d in enumerate(deliverables, 1):
                    content.append(Paragraph(f"{i}. {d}", body_style))
                content.append(Spacer(1, 10))
            
            # Terms and Conditions
            if contract.get("terms"):
                content.append(Paragraph("ADDITIONAL TERMS", heading_style))
                content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
                content.append(Paragraph(contract.get("terms"), body_style))
                content.append(Spacer(1, 10))
            
            # Legal Clauses
            content.append(Paragraph("LEGAL PROVISIONS", heading_style))
            content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
            
            if contract.get("confidentiality_clause"):
                content.append(Paragraph("Confidentiality", subheading_style))
                content.append(Paragraph(contract.get("confidentiality_clause"), body_style))
            
            if contract.get("intellectual_property"):
                content.append(Paragraph("Intellectual Property", subheading_style))
                content.append(Paragraph(contract.get("intellectual_property"), body_style))
            
            if contract.get("termination_conditions"):
                content.append(Paragraph("Termination", subheading_style))
                content.append(Paragraph(contract.get("termination_conditions"), body_style))
            
            if contract.get("dispute_resolution"):
                content.append(Paragraph("Dispute Resolution", subheading_style))
                content.append(Paragraph(contract.get("dispute_resolution"), body_style))
            
            content.append(Spacer(1, 20))
            
            # Signatures Section
            content.append(Paragraph("SIGNATURES", heading_style))
            content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
            content.append(Spacer(1, 10))
            
            # Helper function to load signature image
            def get_signature_image(signature_url, max_width=2*inch, max_height=0.6*inch):
                if not signature_url:
                    return None
                try:
                    if signature_url.startswith('/api/'):
                        # Load from file system
                        filename = signature_url.split('/')[-1]
                        file_path = f"/app/public/uploads/signatures/{filename}"
                        if os.path.exists(file_path):
                            img = Image(file_path, width=max_width, height=max_height)
                            img.hAlign = 'LEFT'
                            return img
                    elif signature_url.startswith('data:'):
                        # Base64 data URL
                        header, encoded = signature_url.split(',', 1)
                        img_data = base64.b64decode(encoded)
                        img_buffer = io.BytesIO(img_data)
                        img = Image(img_buffer, width=max_width, height=max_height)
                        img.hAlign = 'LEFT'
                        return img
                except Exception as e:
                    logger.warning(f"Could not load signature image: {e}")
                return None
            
            # Employer signature
            content.append(Paragraph("<b>EMPLOYER</b>", body_style))
            employer_sig = get_signature_image(contract.get("employer_signature"))
            if employer_sig:
                content.append(employer_sig)
            else:
                content.append(Paragraph("_" * 40, body_style))
            content.append(Paragraph(f"{contract.get('employer_name', 'N/A')}", body_style))
            if contract.get("employer_signed_at"):
                signed_date = contract.get("employer_signed_at")[:10]
                content.append(Paragraph(f"Signed: {signed_date}", label_style))
            else:
                content.append(Paragraph("Signed: Upon contract creation", label_style))
            
            content.append(Spacer(1, 20))
            
            # Contractor signature
            content.append(Paragraph("<b>CONTRACTOR</b>", body_style))
            contractor_sig = get_signature_image(contract.get("contractor_signature"))
            if contractor_sig:
                content.append(contractor_sig)
            elif contract.get("contractor_signed"):
                content.append(Paragraph("[Electronically Signed]", body_style))
            else:
                content.append(Paragraph("_" * 40, body_style))
            content.append(Paragraph(f"{contract.get('contractor_name', 'N/A')}", body_style))
            if contract.get("contractor_signed_at"):
                signed_date = contract.get("contractor_signed_at")[:10]
                content.append(Paragraph(f"Signed: {signed_date}", label_style))
            elif contract.get("contractor_signed"):
                content.append(Paragraph("Signed: Electronically accepted", label_style))
            else:
                content.append(Paragraph("Signed: Pending", label_style))
            
            # Footer
            content.append(Spacer(1, 30))
            content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
            content.append(Paragraph(
                f"This document was generated on {datetime.now().strftime('%Y-%m-%d at %H:%M')} UTC",
                ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)
            ))
            
            # Build PDF
            doc.build(content)
            
            # Return PDF
            buffer.seek(0)
            filename = f"Contract_{contract.get('id', 'unknown')[:8]}_{contract.get('title', 'Contract').replace(' ', '_')[:20]}.pdf"
            
            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating contract PDF: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== MILESTONE MANAGEMENT ====================
    
    @contracts_router.post("/{contract_id}/milestones")
    async def add_milestone(
        contract_id: str,
        data: MilestoneCreate,
        current_user = Depends(get_current_user)
    ):
        """Add milestone to contract (employer only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can add milestones")
            
            if contract.get("status") not in ["draft", "active"]:
                raise HTTPException(status_code=400, detail="Cannot modify finalized contract")
            
            milestones = contract.get("milestones", [])
            new_milestone = {
                "id": str(uuid.uuid4()),
                "order": len(milestones) + 1,
                "title": data.title,
                "description": data.description,
                "amount": data.amount,
                "due_date": data.due_date,
                "status": "pending",
                "submitted_at": None,
                "approved_at": None,
                "paid_at": None
            }
            
            milestones.append(new_milestone)
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "has_milestones": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "milestone": new_milestone}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error adding milestone: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/milestones/{milestone_id}/submit")
    async def submit_milestone(
        contract_id: str,
        milestone_id: str,
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """Submit milestone for review (contractor only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("contractor_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only contractor can submit milestones")
            
            if contract.get("status") != "active":
                raise HTTPException(status_code=400, detail="Contract must be active")
            
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestones[milestone_idx].get("status") not in ["pending", "in_progress"]:
                raise HTTPException(status_code=400, detail="Milestone cannot be submitted")
            
            milestones[milestone_idx]["status"] = "submitted"
            milestones[milestone_idx]["submitted_at"] = datetime.now(timezone.utc).isoformat()
            milestones[milestone_idx]["submission_notes"] = data.get("notes", "")
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Send real-time notification to employer
            try:
                await create_notification(
                    db=db,
                    user_id=contract.get("employer_id"),
                    notification_type="milestone_submitted",
                    title="Milestone Submitted for Review",
                    message=f"{contract.get('contractor_name')} submitted '{milestones[milestone_idx].get('title')}' for approval",
                    link=f"/contracts/{contract_id}",
                    metadata={
                        "contract_id": contract_id,
                        "milestone_id": milestone_id,
                        "milestone_title": milestones[milestone_idx].get("title"),
                        "contractor_name": contract.get("contractor_name")
                    }
                )
            except Exception as notif_err:
                logger.warning(f"Failed to send milestone notification: {notif_err}")
            
            return {"success": True, "message": "Milestone submitted for review"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error submitting milestone: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/milestones/{milestone_id}/approve")
    async def approve_milestone(
        contract_id: str,
        milestone_id: str,
        current_user = Depends(get_current_user)
    ):
        """Approve submitted milestone (employer only)"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can approve milestones")
            
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestones[milestone_idx].get("status") != "submitted":
                raise HTTPException(status_code=400, detail="Milestone not submitted for review")
            
            milestones[milestone_idx]["status"] = "approved"
            milestones[milestone_idx]["approved_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Send real-time notification to contractor
            try:
                await create_notification(
                    db=db,
                    user_id=contract.get("contractor_id"),
                    notification_type="milestone_approved",
                    title="Milestone Approved!",
                    message=f"'{milestones[milestone_idx].get('title')}' has been approved by {contract.get('employer_name')}",
                    link=f"/contracts/{contract_id}",
                    metadata={
                        "contract_id": contract_id,
                        "milestone_id": milestone_id,
                        "milestone_title": milestones[milestone_idx].get("title"),
                        "employer_name": contract.get("employer_name")
                    }
                )
            except Exception as notif_err:
                logger.warning(f"Failed to send milestone approval notification: {notif_err}")
            
            return {"success": True, "message": "Milestone approved"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error approving milestone: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @contracts_router.post("/{contract_id}/milestones/{milestone_id}/pay")
    async def mark_milestone_paid(
        contract_id: str,
        milestone_id: str,
        current_user = Depends(get_current_user)
    ):
        """Mark milestone as paid (employer only) - manual tracking"""
        try:
            contract = await db.contracts.find_one({"id": contract_id})
            
            if not contract:
                raise HTTPException(status_code=404, detail="Contract not found")
            
            if contract.get("employer_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Only employer can mark as paid")
            
            milestones = contract.get("milestones", [])
            milestone_idx = next((i for i, m in enumerate(milestones) if m.get("id") == milestone_id), None)
            
            if milestone_idx is None:
                raise HTTPException(status_code=404, detail="Milestone not found")
            
            if milestones[milestone_idx].get("status") != "approved":
                raise HTTPException(status_code=400, detail="Milestone must be approved first")
            
            milestone_amount = milestones[milestone_idx].get("amount", 0)
            milestones[milestone_idx]["status"] = "paid"
            milestones[milestone_idx]["paid_at"] = datetime.now(timezone.utc).isoformat()
            
            # Update total paid
            total_paid = contract.get("total_paid", 0) + milestone_amount
            
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {
                    "milestones": milestones,
                    "total_paid": total_paid,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Send real-time notification to contractor about payment
            try:
                await create_notification(
                    db=db,
                    user_id=contract.get("contractor_id"),
                    notification_type="payment_received",
                    title="Payment Received!",
                    message=f"You received {contract.get('payment_currency', 'USD')} {milestone_amount:,.2f} for '{milestones[milestone_idx].get('title')}'",
                    link=f"/contracts/{contract_id}",
                    metadata={
                        "contract_id": contract_id,
                        "milestone_id": milestone_id,
                        "milestone_title": milestones[milestone_idx].get("title"),
                        "amount": milestone_amount,
                        "currency": contract.get("payment_currency", "USD")
                    }
                )
            except Exception as notif_err:
                logger.warning(f"Failed to send payment notification: {notif_err}")
            
            return {"success": True, "message": "Milestone marked as paid", "total_paid": total_paid}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error marking milestone paid: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== STATS ====================
    
    @contracts_router.get("/stats/overview")
    async def get_contract_stats(
        current_user = Depends(get_current_user)
    ):
        """Get contract statistics for current user"""
        try:
            # Get all contracts where user is a party
            contracts = await db.contracts.find({
                "$or": [
                    {"employer_id": current_user.id},
                    {"contractor_id": current_user.id}
                ]
            }, {"_id": 0}).to_list(length=1000)
            
            as_employer = [c for c in contracts if c.get("employer_id") == current_user.id]
            as_contractor = [c for c in contracts if c.get("contractor_id") == current_user.id]
            
            stats = {
                "total_contracts": len(contracts),
                "as_employer": {
                    "total": len(as_employer),
                    "active": sum(1 for c in as_employer if c.get("status") == "active"),
                    "completed": sum(1 for c in as_employer if c.get("status") == "completed"),
                    "total_value": sum(c.get("payment_amount", 0) for c in as_employer),
                    "total_paid": sum(c.get("total_paid", 0) for c in as_employer)
                },
                "as_contractor": {
                    "total": len(as_contractor),
                    "active": sum(1 for c in as_contractor if c.get("status") == "active"),
                    "completed": sum(1 for c in as_contractor if c.get("status") == "completed"),
                    "total_value": sum(c.get("payment_amount", 0) for c in as_contractor),
                    "total_earned": sum(c.get("total_paid", 0) for c in as_contractor)
                }
            }
            
            return {"success": True, "stats": stats}
            
        except Exception as e:
            logger.error(f"Error getting contract stats: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return contracts_router
