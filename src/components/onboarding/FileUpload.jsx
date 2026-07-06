/// FileUpload.jsx
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';

export const FileUpload = ({ label, accept, onFileChange, required, file }) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    onFileChange(selectedFile);
  };

  const handleRemove = () => {
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Choose  file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {file && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground truncate max-w-50">
              {file.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          </div>
        )}
      </div>
      {!file && required && (
        <p className="text-sm text-destructive">Please upload a file</p>
      )}
    </div>
  );
};