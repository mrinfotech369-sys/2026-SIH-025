"""
Store Provider Abstraction — IP-SAKTI Sahayak Step 2.
"""

import logging
import os
from typing import Optional

from rag.store.local_store import get_local_store

logger = logging.getLogger(__name__)

_STORE_INSTANCE = None

def get_store():
    """
    Factory: return the configured store instance.
    Uses Supabase if credentials are provided, otherwise falls back to LocalStore.
    """
    global _STORE_INSTANCE
    if _STORE_INSTANCE is not None:
        return _STORE_INSTANCE

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if supabase_url and supabase_key:
        try:
            from rag.store.supabase_store import SupabaseStore
            _STORE_INSTANCE = SupabaseStore(url=supabase_url, key=supabase_key)
            logger.info("Using Supabase store.")
        except Exception as e:
            logger.error("Failed to init SupabaseStore: %s. Falling back to local store.", e)
            _STORE_INSTANCE = get_local_store()
    else:
        logger.info("Supabase credentials not found. Using local store.")
        _STORE_INSTANCE = get_local_store()

    return _STORE_INSTANCE
