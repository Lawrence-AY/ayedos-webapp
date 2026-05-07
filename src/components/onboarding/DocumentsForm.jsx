import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { GrLinkNext } from "react-icons/gr";

export const DocumentsForm = ({
  formData,
  onFileChange,
  errors,
  isLoading,
  onSubmit,
  onBack,
}) => {
  const { idFile, photoFile } = formData;

  // State for preview URLs
  const [idPreview, setIdPreview] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Generate preview URLs when files change
  useEffect(() => {
    if (idFile && idFile instanceof File) {
      const url = URL.createObjectURL(idFile);
      setIdPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setIdPreview(null);
    }
  }, [idFile]);

  useEffect(() => {
    if (photoFile && photoFile instanceof File) {
      const url = URL.createObjectURL(photoFile);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPhotoPreview(null);
    }
  }, [photoFile]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Two upload columns side by side */}
      <div className="flex gap-4">
        {/* ID Front Column */}
        <div className="flex-1">
          <FileUpload
            label="Upload ID Front (.jpeg, .png, .jpg)"
            accept="image/*"
            onFileChange={(file) => onFileChange('idFile', file)}
            required
            file={idFile}
          />
          {idPreview && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Preview:</p>
              <img
                src={idPreview}
                alt="ID Front Preview"
                className="w-full max-h-40 rounded-lg border shadow-sm object-contain bg-gray-50"
              />
            </div>
          )}
        </div>

        {/* ID Back Column */}
        <div className="flex-1">
          <FileUpload
            label="ID Back (.jpeg, .png, .jpg)"
            accept="image/*"
            onFileChange={(file) => onFileChange('photoFile', file)}
            required
            file={photoFile}
          />
          {photoPreview && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Preview:</p>
              <img
                src={photoPreview}
                alt="ID Back Preview"
                className="w-full max-h-40 rounded-lg border shadow-sm object-contain bg-gray-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Buttons with gap‑4 and consistent styling */}
      <div className="flex justify-between gap-4">
        <Button
          type="button"
          className="p-2 h-13 bg-[#003a16] text-white rounded-md flex items-center justify-center gap-2"
          size="lg"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-light">Back</span>
            <span className="font-semibold">Personal Details</span>
          </div>
        </Button>
        <Button
          type="submit"
          className="p-2 h-13 bg-[#8cc63f] text-white rounded-md flex items-center justify-center gap-2"
          size="lg"
          disabled={isLoading}
        >
          <div className="flex flex-col text-left">
            <span className="text-xs font-light">Next</span>
            <span className="font-semibold">Payment</span>
          </div>
          <GrLinkNext />
        </Button>
      </div>
    </form>
  );
};