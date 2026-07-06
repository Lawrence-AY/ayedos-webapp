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

  // Determine what to show based on ID type
  const isPassport = idType === 'passport';
  const isDriverLicense = idType === 'driverlicense';
  const isNationalId = idType === 'national' || !idType; // default to national ID behavior

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Passport upload - only show passport image, no ID front/back */}
      {isPassport && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Label htmlFor="idDocument">
            Upload Passport <span className="text-destructive">*</span>
          </Label>
          <FileUpload
            label="Upload Passport (.jpg, .jpeg, .png)"
            accept=".jpg,.jpeg,.png"
            onFileChange={(file) => onIdDocumentChange?.('idDocument', file)}
            required
            file={idDocument}
          />
          {docPreview && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Preview:</p>
              <img
                src={docPreview}
                alt="Passport Preview"
                className="w-full max-h-40 rounded-lg border shadow-sm object-contain bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Driver's License upload - only show license image, no ID front/back */}
      {isDriverLicense && (
        <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Label htmlFor="idDocument">
            Upload Driver's License <span className="text-destructive">*</span>
          </Label>
          <FileUpload
            label="Upload Driver's License (.jpg, .jpeg, .png)"
            accept=".jpg,.jpeg,.png"
            onFileChange={(file) => onIdDocumentChange?.('idDocument', file)}
            required
            file={idDocument}
          />
          {docPreview && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Preview:</p>
              <img
                src={docPreview}
                alt="Driver's License Preview"
                className="w-full max-h-40 rounded-lg border shadow-sm object-contain bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* National ID - show front and back uploads */}
      {isNationalId && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <FileUpload
              label="Upload ID Front (.jpg, .jpeg, .png)"
              accept=".jpg,.jpeg,.png"
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
              label="ID Back (.jpg, .jpeg, .png)"
              accept=".jpg,.jpeg,.png"
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
      )}

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