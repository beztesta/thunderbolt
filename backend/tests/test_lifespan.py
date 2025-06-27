"""Test the application lifespan functionality."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import pytest

from main import app, proxy_lifespan


# Add a simple test that doesn't require asyncio
def test_app_exists() -> None:
    """Simple test to verify that pytest discovers the test file."""
    assert app is not None
    print("test_app_exists was executed")


@pytest.mark.asyncio
async def test_proxy_lifespan() -> None:
    """Test that the proxy lifespan function works correctly."""
    # Use the proxy_lifespan context manager directly
    async with proxy_lifespan(app):
        # If we get here without an exception, the startup phase works
        assert True
    # If we get here, the shutdown phase also works
    assert True


@asynccontextmanager
async def mock_lifespan(app: Any) -> AsyncIterator[None]:
    """Mock lifespan function."""
    yield


# Debug code to help identify if the module is being loaded
print("test_lifespan.py module was loaded")
