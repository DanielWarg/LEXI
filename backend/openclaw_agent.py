"""
OpenClawAgent - Integration with remote OpenClaw instance via Tailscale.

Uses OpenAI-compatible API endpoint for communication.
"""

import asyncio
import aiohttp
import json
import ssl
from typing import Optional, Callable, Any


class OpenClawAgent:
    """Agent for communicating with a remote OpenClaw instance."""

    def __init__(
        self,
        base_url: str = "",  # e.g., "https://macbook-air-som-tillhr-daniel.tailbbd133.ts.net"
        token: str = "",
        model: str = "sonnet"
    ):
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.token = token
        self.model = model
        self._session: Optional[aiohttp.ClientSession] = None
        self._connected = False

    async def initialize(self):
        """Initialize HTTP session."""
        if not self._session or self._session.closed:
            # Create SSL context that trusts Tailscale certificates
            ssl_context = ssl.create_default_context()
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            self._session = aiohttp.ClientSession(connector=connector)
        print(f"[OpenClawAgent] Initialized - target: {self.base_url}")

    async def close(self):
        """Clean up connections."""
        if self._session and not self._session.closed:
            await self._session.close()
        print("[OpenClawAgent] Session closed")

    def configure(self, base_url: str, token: str = "", model: str = "sonnet"):
        """Update connection settings."""
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.token = token
        self.model = model
        print(f"[OpenClawAgent] Configured - target: {self.base_url}, model: {self.model}")

    def _get_headers(self) -> dict:
        """Build request headers."""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def check_connection(self) -> dict:
        """Test connection to OpenClaw."""
        if not self.base_url:
            return {"connected": False, "error": "No base URL configured"}

        try:
            if not self._session or self._session.closed:
                await self.initialize()

            # Test with a simple request
            url = f"{self.base_url}/v1/chat/completions"
            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 5
            }

            async with self._session.post(
                url,
                headers=self._get_headers(),
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    self._connected = True
                    print(f"[OpenClawAgent] Connection verified")
                    return {"connected": True, "status": "ok"}
                else:
                    error_text = await resp.text()
                    self._connected = False
                    return {"connected": False, "error": f"HTTP {resp.status}: {error_text}"}

        except asyncio.TimeoutError:
            self._connected = False
            return {"connected": False, "error": "Connection timeout"}
        except aiohttp.ClientError as e:
            self._connected = False
            return {"connected": False, "error": str(e)}
        except Exception as e:
            self._connected = False
            print(f"[OpenClawAgent] Connection error: {e}")
            return {"connected": False, "error": str(e)}

    async def send_task(
        self,
        prompt: str,
        timeout: int = 120,
        system_prompt: str = None
    ) -> dict:
        """
        Send a task to OpenClaw using OpenAI-compatible API.

        Args:
            prompt: The task/instruction to send
            timeout: Max seconds to wait for response
            system_prompt: Optional system message

        Returns:
            dict with 'success', 'response' or 'error'
        """
        if not self.base_url:
            return {"success": False, "error": "No base URL configured"}

        try:
            if not self._session or self._session.closed:
                await self.initialize()

            url = f"{self.base_url}/v1/chat/completions"

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": 4096
            }

            print(f"[OpenClawAgent] Sending task: {prompt[:50]}...")

            async with self._session.post(
                url,
                headers=self._get_headers(),
                json=payload,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()

                    # Extract response from OpenAI format
                    choices = data.get("choices", [])
                    if choices:
                        response_text = choices[0].get("message", {}).get("content", "")
                        print(f"[OpenClawAgent] Response received ({len(response_text)} chars)")
                        return {"success": True, "response": response_text}
                    else:
                        return {"success": False, "error": "No response choices"}
                else:
                    error_text = await resp.text()
                    return {"success": False, "error": f"HTTP {resp.status}: {error_text}"}

        except asyncio.TimeoutError:
            return {"success": False, "error": f"Task timed out after {timeout}s"}
        except Exception as e:
            print(f"[OpenClawAgent] Task error: {e}")
            return {"success": False, "error": str(e)}

    async def chat(
        self,
        messages: list,
        timeout: int = 120
    ) -> dict:
        """
        Send a multi-turn conversation to OpenClaw.

        Args:
            messages: List of message dicts with 'role' and 'content'
            timeout: Max seconds to wait for response

        Returns:
            dict with 'success', 'response' or 'error'
        """
        if not self.base_url:
            return {"success": False, "error": "No base URL configured"}

        try:
            if not self._session or self._session.closed:
                await self.initialize()

            url = f"{self.base_url}/v1/chat/completions"

            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": 4096
            }

            async with self._session.post(
                url,
                headers=self._get_headers(),
                json=payload,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        response_text = choices[0].get("message", {}).get("content", "")
                        return {"success": True, "response": response_text}
                    else:
                        return {"success": False, "error": "No response choices"}
                else:
                    error_text = await resp.text()
                    return {"success": False, "error": f"HTTP {resp.status}: {error_text}"}

        except asyncio.TimeoutError:
            return {"success": False, "error": f"Chat timed out after {timeout}s"}
        except Exception as e:
            print(f"[OpenClawAgent] Chat error: {e}")
            return {"success": False, "error": str(e)}
