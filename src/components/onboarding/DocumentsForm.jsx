import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { GrLinkNext } from "react-icons/gr";

export const DocumentsForm = ({
  formData,
  onFileChange,
  idType,
  idDocument,
  onIdDocumentChange,
  isLoading,
  onSubmit,
  onBack,
}) => {
  const { idFile, photoFile } = formData;

  const [idPreview, setIdPreview] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [docPreview, setDocPreview] = useState(null);

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

  useEffect(() => {
    if (idDocument && idDocument instanceof File) {
      const url = URL.createObjectURL(idDocument);
      setDocPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setDocPreview(null);
    }
  }, [idDocument]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Identity Document Upload (for Passport / Driver's License) */}
      {(idType === 'passport' || idType === 'driverlicense') && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Label htmlFor="idDocument">
            Upload {idType === 'passport' ? 'Passport' : "Driver's License"} <span className="text-destructive">*</span>
          </Label>
          <FileUpload
            label={`Upload ${idType === 'passport' ? 'Passport' : "Driver's License"} (.jpeg, .png, .jpg, .pdf)`}
            accept=".pdf,.jpeg,.jpg,.png"
            onFileChange={(file) => onIdDocumentChange?.('idDocument', file)}
            required
            file={idDocument}
          />
          {docPreview && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Preview:</p>
              {idDocument?.type?.startsWith('image/') ? (
                <img
                  src={docPreview}
                  alt="Document Preview"
                  className="w-full max-h-40 rounded-lg border shadow-sm object-contain bg-white"
                />
              ) : (
                <div className="w-full max-h-40 rounded-lg border shadow-sm p-4 bg-white text-center">
                  <p className="text-sm text-gray-600">PDF file selected: {idDocument?.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Two upload columns */}
      <div className="flex flex-col sm:flex-row gap-4">
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

      {/* Buttons - uniform styling */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
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