import os
import secrets

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Response, status
from pydantic import BaseModel, Field
from weasyprint import CSS, HTML


class RenderOptions(BaseModel):
    page_size: str = "A4"
    margin: str = "20mm"


class RenderPdfRequest(BaseModel):
    html: str
    options: RenderOptions = Field(default_factory=RenderOptions)


def require_api_key(api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    expected_key = os.getenv("SIDECAR_API_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SIDECAR_API_KEY is not configured.",
        )

    if not api_key or not secrets.compare_digest(api_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )


app = FastAPI(title="Leadership Quarter Sidecar")
protected_router = APIRouter(dependencies=[Depends(require_api_key)])


@app.get("/health")
def health_check():
    return {"status": "ok"}


@protected_router.post("/render-pdf")
def render_pdf(payload: RenderPdfRequest):
    html = payload.html.strip()
    if not html:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="HTML content is required.")

    page_css = CSS(
        string=f"@page {{ size: {payload.options.page_size}; margin: {payload.options.margin}; }}"
    )
    pdf_bytes = HTML(string=html).write_pdf(stylesheets=[page_css])
    return Response(content=pdf_bytes, media_type="application/pdf")


app.include_router(protected_router)
