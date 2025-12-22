from fastapi import Request, HTTPException
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class TenantContext:
    """Store current tenant/reseller context"""
    def __init__(self):
        self.reseller_id: Optional[str] = None
        self.reseller_data: Optional[dict] = None
        self.is_main_instance: bool = True

# Global tenant context storage
tenant_context = TenantContext()

async def detect_tenant_middleware(request: Request, call_next, db):
    """
    Middleware to detect which reseller/tenant based on domain.
    Sets tenant context for the request.
    """
    host = request.headers.get("host", "").split(":")[0]
    
    # Reset context
    tenant_context.reseller_id = None
    tenant_context.reseller_data = None
    tenant_context.is_main_instance = True
    
    # Check if this is a custom domain
    # Skip for localhost and main domain
    if host not in ["localhost", "127.0.0.1", "upshift.works", "www.upshift.works"]:
        # Look up reseller by custom domain
        reseller = await db.resellers.find_one({
            "custom_domain": host,
            "status": "active"
        })
        
        if reseller:
            tenant_context.reseller_id = reseller["id"]
            tenant_context.reseller_data = reseller
            tenant_context.is_main_instance = False
            logger.info(f"Request from reseller domain: {host} - {reseller['brand_name']}")
        else:
            # Custom domain but no reseller found
            logger.warning(f"Unknown domain: {host}")
            raise HTTPException(
                status_code=404,
                detail="Domain not configured. Please contact support."
            )
    
    # Add tenant info to request state
    request.state.reseller_id = tenant_context.reseller_id
    request.state.reseller_data = tenant_context.reseller_data
    request.state.is_main_instance = tenant_context.is_main_instance
    
    response = await call_next(request)
    return response

def get_current_reseller(request: Request) -> Optional[dict]:
    """Get current reseller from request context"""
    return getattr(request.state, "reseller_data", None)

def get_current_reseller_id(request: Request) -> Optional[str]:
    """Get current reseller ID from request context"""
    return getattr(request.state, "reseller_id", None)

def is_main_instance(request: Request) -> bool:
    """Check if this is the main instance (not a reseller)"""
    return getattr(request.state, "is_main_instance", True)

def require_main_instance(request: Request):
    """Raise error if not on main instance"""
    if not is_main_instance(request):
        raise HTTPException(
            status_code=403,
            detail="This feature is only available on the main platform"
        )

def require_reseller_context(request: Request):
    """Raise error if not in reseller context"""
    if is_main_instance(request):
        raise HTTPException(
            status_code=403,
            detail="This feature requires a reseller context"
        )
