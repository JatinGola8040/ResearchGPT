from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.schemas import ExportRequest
from app.services.export_service import generate_pdf_export, generate_docx_export

router = APIRouter(prefix="/export", tags=["export"])

@router.post("", status_code=200)
def export_report(req: ExportRequest):
    """
    Export AI generated response as downloadable PDF or DOCX file.
    Does not call Groq again. Reuses the provided AI content dictionary.
    """
    export_type = req.type.lower().strip()
    if export_type not in ["pdf", "docx"]:
        raise HTTPException(status_code=400, detail="Invalid export type. Must be 'pdf' or 'docx'.")
        
    if not req.content or not isinstance(req.content, dict):
        raise HTTPException(status_code=400, detail="Export content must be a non-empty dictionary.")
        
    try:
        if export_type == "pdf":
            file_bytes = generate_pdf_export(req.content)
            return Response(
                content=file_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": 'attachment; filename="ResearchGPT_Report.pdf"'}
            )
        else:
            file_bytes = generate_docx_export(req.content)
            return Response(
                content=file_bytes,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": 'attachment; filename="ResearchGPT_Report.docx"'}
            )
    except Exception as e:
        print(f"Export generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate {export_type.upper()} export: {str(e)}")
