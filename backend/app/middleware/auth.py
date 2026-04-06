from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.db.database import get_db
from app.models.user import User, SubscriptionTier

security = HTTPBearer()


async def verify_firebase_token(token: str) -> dict:
    """Verify a Firebase ID token and return its claims."""
    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth, credentials
        import json

        # Initialize Firebase app if not already done
        if not firebase_admin._apps:
            if settings.firebase_service_account_json and settings.firebase_service_account_json != "{}":
                cred_data = json.loads(settings.firebase_service_account_json)
                cred = credentials.Certificate(cred_data)
            else:
                # Use project_id only for token verification (works in test env)
                cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {"projectId": settings.firebase_project_id})

        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials

    # In test environment, accept a simple JWT format
    if settings.environment == "test":
        # For testing: token format is "test:<firebase_uid>"
        if token.startswith("test:"):
            firebase_uid = token.split(":", 1)[1]
            result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            return user

    claims = await verify_firebase_token(token)
    firebase_uid = claims["uid"]

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not registered. Please complete sign-up.",
        )

    return user


async def require_premium(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires a premium subscription."""
    if current_user.subscription != SubscriptionTier.premium:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="This feature requires a Premium subscription.",
        )
    return current_user
