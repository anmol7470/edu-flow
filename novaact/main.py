import os
from typing import Any, Dict, Optional
from concurrent.futures import ThreadPoolExecutor
import asyncio

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Nova Act API")

# Thread pool for running synchronous NovaAct code
executor = ThreadPoolExecutor(max_workers=4)


class WebAgentRequest(BaseModel):
    starting_page: str
    instructions: str
    headless: bool = True


class WebAgentResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
    steps_executed: int = 0
    session_id: Optional[str] = None
    act_id: Optional[str] = None
    parsed_response: Optional[Any] = None
    valid_json: Optional[bool] = None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "nova-act-api"}


def _run_nova_act_sync(
    starting_page: str, instructions: str, headless: bool, api_key: str
) -> Dict[str, Any]:
    """
    Synchronous function to run Nova Act (runs in a thread pool)
    This is necessary because NovaAct uses Playwright's Sync API
    """
    from nova_act import NovaAct

    with NovaAct(
        starting_page=starting_page,
        headless=headless,
        nova_act_api_key=api_key,
    ) as nova:
        act_result = nova.act(instructions, max_steps=30)

        response_data = {
            "success": True,
            "response": act_result.response,
            "steps_executed": act_result.metadata.num_steps_executed,
            "session_id": act_result.metadata.session_id,
            "act_id": act_result.metadata.act_id,
        }

        # Include parsed response if JSON was requested
        if act_result.parsed_response is not None:
            response_data["parsed_response"] = act_result.parsed_response
            response_data["valid_json"] = act_result.valid_json

        return response_data


@app.post("/agent/run", response_model=WebAgentResponse)
async def run_web_agent(request: WebAgentRequest):
    """
    Execute Nova Act web agent with given instructions
    """
    try:
        # Validate API key
        api_key = os.environ.get("NOVA_ACT_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, detail="NOVA_ACT_API_KEY environment variable not set"
            )

        # Run Nova Act in a thread pool to avoid asyncio conflicts with Playwright Sync API
        loop = asyncio.get_event_loop()
        response_data = await loop.run_in_executor(
            executor,
            _run_nova_act_sync,
            request.starting_page,
            request.instructions,
            request.headless,
            api_key,
        )

        return response_data

    except Exception as e:
        error_message = str(e)
        print(f"Error executing Nova Act: {error_message}")
        return WebAgentResponse(
            success=False,
            response=None,
            error=error_message,
            steps_executed=0,
        )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
