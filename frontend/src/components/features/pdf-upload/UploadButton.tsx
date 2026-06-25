import { Upload } from "lucide-react";

export function UploadButton() {
  return (
    <button className="btn btn-primary w-full gap-2 py-3 shadow-[0_0_10px_rgba(14,165,233,0.3)] hover:shadow-[0_0_20px_rgba(14,165,233,0.5)]">
      <Upload className="w-4 h-4" />
      Upload PDFs
    </button>
  );
}
