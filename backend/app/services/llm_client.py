import json
import logging
import time
from typing import List, Dict, Any, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.config import settings
from app.utils.json_helper import extract_clean_text, extract_json_from_response

logger = logging.getLogger("researchgpt.llm_client")

T = TypeVar("T", bound=BaseModel)

# -------------------------------------------------------------
# Domain Exceptions
# -------------------------------------------------------------
class LLMException(Exception):
    def __init__(self, message: str, code: str = "LLM_PROVIDER_ERROR", status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code

class LLMRateLimitError(LLMException):
    def __init__(self, message: str = "LLM inference rate limit exceeded. Please retry shortly."):
        super().__init__(message, code="LLM_RATE_LIMITED", status_code=429)

class LLMTimeoutError(LLMException):
    def __init__(self, message: str = "LLM inference request timed out. Please try again."):
        super().__init__(message, code="LLM_TIMEOUT", status_code=408)

class LLMProviderError(LLMException):
    def __init__(self, message: str = "LLM upstream provider encountered an error."):
        super().__init__(message, code="LLM_PROVIDER_ERROR", status_code=502)

class LLMInvalidResponseError(LLMException):
    def __init__(self, message: str = "LLM provider returned an invalid or empty response."):
        super().__init__(message, code="LLM_INVALID_RESPONSE", status_code=502)

class LLMJsonParseError(LLMException):
    def __init__(self, message: str = "Failed to parse structured JSON from LLM response."):
        super().__init__(message, code="LLM_JSON_PARSE_ERROR", status_code=500)

class LLMConfigError(LLMException):
    def __init__(self, message: str = "LLM configuration or API key is missing or invalid."):
        super().__init__(message, code="LLM_CONFIGURATION_ERROR", status_code=500)


class LLMClient:
    """
    Centralized LLM client abstraction.
    Gemini (Google AI Studio free tier) is the primary provider when GEMINI_API_KEY is set;
    OpenRouter is the fallback. Handles authentication, request structuring,
    timeouts, rate-limit backoff, and JSON repair.
    """

    OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
    GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def __init__(self):
        self.api_key = getattr(settings, "OPENROUTER_API_KEY", "").strip()
        self.model = getattr(settings, "LLM_MODEL", "openai/gpt-oss-120b")
        self.gemini_api_key = getattr(settings, "GEMINI_API_KEY", "").strip()
        self.gemini_model = getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")
        self.last_provider_used: Optional[str] = None
        self.default_temperature = float(getattr(settings, "LLM_TEMPERATURE", 0.2))
        self.default_max_tokens = int(getattr(settings, "LLM_MAX_TOKENS", 4096))
        self.default_top_p = float(getattr(settings, "LLM_TOP_P", 0.95))
        self.timeout = float(getattr(settings, "LLM_TIMEOUT", 60))
        self.site_url = getattr(settings, "OPENROUTER_SITE_URL", "http://localhost:3000")
        self.site_name = getattr(settings, "OPENROUTER_SITE_NAME", "ResearchGPT")

    def _get_headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise LLMConfigError("OPENROUTER_API_KEY is not configured in environment.")
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
        }

    def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        response_format: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> str:
        """
        Executes a completion request. Tries Gemini first when a GEMINI_API_KEY is
        configured; on any provider error it falls back to OpenRouter.
        """
        if self.gemini_api_key:
            try:
                result = self._generate_gemini(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p,
                    response_format=response_format,
                    timeout=timeout,
                )
                self.last_provider_used = f"gemini:{self.gemini_model}"
                return result
            except LLMException as e:
                logger.warning(f"Gemini primary failed ({e.code}): {e}. Falling back to OpenRouter.")
            except Exception as e:
                logger.warning(f"Gemini primary failed unexpectedly: {e}. Falling back to OpenRouter.")
        result = self._generate_openrouter(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            response_format=response_format,
            timeout=timeout,
        )
        self.last_provider_used = f"openrouter:{self.model}"
        return result

    def _generate_gemini(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        response_format: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> str:
        """
        Executes a completion request against the Gemini generateContent REST API.
        Maps the chat-style message list into Gemini contents; system messages are
        passed via system_instruction. 1-shot retry on 429.
        """
        if not self.gemini_api_key:
            raise LLMConfigError("GEMINI_API_KEY is not configured in environment.")

        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        p_val = top_p if top_p is not None else self.default_top_p
        req_timeout = timeout if timeout is not None else self.timeout

        system_parts: List[str] = []
        contents: List[Dict[str, Any]] = []
        for m in messages:
            role = m.get("role", "user")
            text = m.get("content", "")
            if role == "system":
                system_parts.append(text)
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": text}]})
            else:
                contents.append({"role": "user", "parts": [{"text": text}]})
        if not contents:
            contents = [{"role": "user", "parts": [{"text": ""}]}]

        generation_config: Dict[str, Any] = {
            "temperature": temp,
            "maxOutputTokens": tokens,
            "topP": p_val,
        }
        if response_format and response_format.get("type") == "json_object":
            generation_config["responseMimeType"] = "application/json"

        payload: Dict[str, Any] = {"contents": contents, "generationConfig": generation_config}
        if system_parts:
            payload["system_instruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}

        url = self.GEMINI_ENDPOINT.format(model=self.gemini_model)
        headers = {"Content-Type": "application/json", "x-goog-api-key": self.gemini_api_key}

        max_retries = 1
        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Gemini Request -> Model: {self.gemini_model}, Attempt: {attempt + 1}/{max_retries + 1}")
                with httpx.Client(timeout=req_timeout) as client:
                    response = client.post(url, headers=headers, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise LLMInvalidResponseError("Gemini response contained no candidates.")
                    parts = (candidates[0].get("content") or {}).get("parts") or []
                    raw_content = "".join(p.get("text", "") for p in parts)
                    if not raw_content.strip():
                        raise LLMInvalidResponseError("Gemini response contained no text parts.")
                    clean_content = extract_clean_text(raw_content)
                    return clean_content or raw_content.strip()

                elif response.status_code == 429:
                    logger.warning(f"Gemini 429 Rate Limit (Attempt {attempt + 1})")
                    if attempt < max_retries:
                        retry_after = response.headers.get("Retry-After")
                        backoff = float(retry_after) if retry_after and retry_after.replace(".", "", 1).isdigit() else 5.0
                        logger.info(f"Backing off for {backoff} seconds before retry...")
                        time.sleep(backoff)
                        continue
                    raise LLMRateLimitError("Gemini free-tier rate limit reached. Please retry shortly.")

                elif response.status_code in (408, 504):
                    raise LLMTimeoutError(f"Gemini gateway timeout (HTTP {response.status_code}).")

                elif response.status_code in (500, 502, 503):
                    raise LLMProviderError(f"Gemini upstream error (HTTP {response.status_code}).")

                elif response.status_code in (401, 403):
                    raise LLMConfigError(
                        f"Gemini rejected the API key (HTTP {response.status_code}). "
                        "Check GEMINI_API_KEY in backend/.env."
                    )

                elif response.status_code == 400:
                    raise LLMProviderError(f"Gemini bad request (HTTP 400): {response.text[:200]}")

                elif response.status_code == 404:
                    raise LLMConfigError(
                        f"Gemini model '{self.gemini_model}' not found (404). Check GEMINI_MODEL in backend/app/config.py."
                    )

                else:
                    raise LLMProviderError(f"Gemini returned HTTP {response.status_code}: {response.text[:150]}")

            except httpx.TimeoutException:
                raise LLMTimeoutError("Request to Gemini timed out.")
            except httpx.RequestError as e:
                raise LLMProviderError(f"Failed to connect to Gemini: {e}")

        raise LLMProviderError("Exceeded maximum retry attempts for Gemini.")

    def _generate_openrouter(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        response_format: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> str:
        """
        Executes a completion request against OpenRouter REST API with 1-shot retry on 429.
        """
        headers = self._get_headers()
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        p_val = top_p if top_p is not None else self.default_top_p
        req_timeout = timeout if timeout is not None else self.timeout

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temp,
            "max_tokens": tokens,
            "top_p": p_val,
            "stream": False
        }
        if response_format:
            payload["response_format"] = response_format

        max_retries = 1
        for attempt in range(max_retries + 1):
            try:
                logger.info(f"OpenRouter Request -> Model: {self.model}, Attempt: {attempt + 1}/{max_retries + 1}")
                with httpx.Client(timeout=req_timeout) as client:
                    response = client.post(self.OPENROUTER_ENDPOINT, headers=headers, json=payload)
                
                # Check status codes
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise LLMInvalidResponseError("OpenRouter response contained no choices.")
                    message = choices[0].get("message", {})
                    raw_content = message.get("content") or message.get("reasoning") or ""
                    clean_content = extract_clean_text(raw_content)
                    result = clean_content or raw_content.strip()
                    if not result:
                        raise LLMInvalidResponseError("OpenRouter response contained empty content.")
                    return result

                elif response.status_code == 429:
                    logger.warning(f"OpenRouter 429 Rate Limit (Attempt {attempt + 1})")
                    if attempt < max_retries:
                        # Extract Retry-After header or default backoff
                        retry_after = response.headers.get("Retry-After")
                        backoff = float(retry_after) if retry_after and retry_after.isdigit() else 5.0
                        logger.info(f"Backing off for {backoff} seconds before retry...")
                        time.sleep(backoff)
                        continue
                    raise LLMRateLimitError("OpenRouter rate limit reached. Please retry shortly.")

                elif response.status_code in (408, 504):
                    logger.error(f"OpenRouter timeout error: HTTP {response.status_code}")
                    raise LLMTimeoutError(f"OpenRouter gateway timeout (HTTP {response.status_code}).")

                elif response.status_code in (500, 502, 503):
                    logger.error(f"OpenRouter server error: HTTP {response.status_code} -> {response.text[:200]}")
                    raise LLMProviderError(f"OpenRouter upstream error (HTTP {response.status_code}).")

                elif response.status_code == 401:
                    logger.error("OpenRouter 401: API key rejected.")
                    raise LLMConfigError(
                        "OpenRouter rejected the API key (401 Unauthorized). "
                        "Check OPENROUTER_API_KEY in backend/.env - it may be invalid, revoked, or pasted with extra whitespace."
                    )

                elif response.status_code == 402:
                    logger.error("OpenRouter 402: insufficient credits.")
                    raise LLMProviderError(
                        "OpenRouter reports insufficient credits (402). "
                        "Top up the account at openrouter.ai/credits or switch LLM_MODEL to a free variant (e.g. ':free')."
                    )

                elif response.status_code == 404:
                    logger.error(f"OpenRouter 404: model not found -> {self.model}")
                    raise LLMConfigError(
                        f"OpenRouter could not find the model '{self.model}' (404). Check LLM_MODEL in backend/app/config.py."
                    )

                else:
                    logger.error(f"OpenRouter unexpected status {response.status_code}: {response.text[:200]}")
                    raise LLMProviderError(f"OpenRouter returned HTTP {response.status_code}: {response.text[:150]}")

            except httpx.TimeoutException:
                logger.error(f"OpenRouter httpx timeout after {req_timeout}s")
                raise LLMTimeoutError("Request to OpenRouter timed out.")
            except httpx.RequestError as e:
                logger.error(f"OpenRouter network connection error: {e}")
                raise LLMProviderError(f"Failed to connect to OpenRouter: {e}")

        raise LLMProviderError("Exceeded maximum retry attempts for OpenRouter.")

    def generate_json(
        self,
        messages: List[Dict[str, str]],
        schema_cls: Optional[Type[T]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        max_repair_attempts: int = 1
    ) -> Dict[str, Any]:
        """
        Executes an inference request expecting a structured JSON response.
        Automatically removes markdown code fences and performs a controlled repair if parsing fails.
        """
        # Call generate
        raw_text = self.generate(
            messages=messages,
            temperature=temperature if temperature is not None else self.default_temperature,
            max_tokens=max_tokens if max_tokens is not None else self.default_max_tokens
        )

        parsed_data = extract_json_from_response(raw_text)
        if not parsed_data:
            logger.warning(f"Failed initial JSON extraction. Raw text length: {len(raw_text)}. Raw snippet: {raw_text[:300]}")

        # Validate with Pydantic if schema provided
        if schema_cls and parsed_data:
            try:
                schema_cls.model_validate(parsed_data)
                return parsed_data
            except ValidationError as ve:
                logger.warning(f"Pydantic validation warning: {ve}")
                if isinstance(parsed_data, dict) and len(parsed_data) > 0:
                    return parsed_data

        if parsed_data:
            return parsed_data

        # If parsing or validation failed, attempt ONE controlled repair
        if max_repair_attempts > 0:
            logger.info("Attempting controlled JSON repair with OpenRouter...")
            repair_prompt = (
                "The previous output was not valid JSON or was cut off.\n"
                f"Previous Output: {raw_text[:2500]}\n\n"
                "Return ONLY a clean, valid, complete JSON object. Ensure all strings and brackets are closed properly."
            )
            repair_messages = list(messages) + [
                {"role": "assistant", "content": raw_text[:2000]},
                {"role": "user", "content": repair_prompt}
            ]
            try:
                repair_text = self.generate(
                    messages=repair_messages,
                    temperature=0.1,
                    max_tokens=max_tokens or 2048
                )
                repaired_data = extract_json_from_response(repair_text)
                if repaired_data:
                    if schema_cls:
                        try:
                            schema_cls.model_validate(repaired_data)
                        except ValidationError:
                            pass
                    return repaired_data
            except Exception as e:
                logger.warning(f"Repair attempt encountered error: {e}")

        fallback_data = extract_json_from_response(raw_text)
        if fallback_data:
            return fallback_data

        raise LLMJsonParseError("Failed to extract valid structured JSON from OpenRouter output.")


# Singleton Client Instance
llm_client = LLMClient()
