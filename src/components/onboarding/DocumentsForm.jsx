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

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FileUpload
        label="Upload ID (.jpeg, .png, .jpg)"
        accept="image/*"
        onFileChange={(file) => onFileChange('idFile', file)}
        required
        file={idFile}
      />

      <FileUpload
        label="Upload Passport Photo"
        accept="image/*"
        onFileChange={(file) => onFileChange('photoFile', file)}
        required
        file={photoFile}
      />

      {/*{errors.step2 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errors.step2}</AlertDescription>
        </Alert>
      )}
*/}
      <div className="flex justify-between">
         
         <Button 
           type="button" 
          className="p-2 h-13 bg-[#003a16]  
           text-white rounded-md flex items-center justify-center gap-2" 
          size="lg" 
           onClick={onBack}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2"> {/* flex-row is default for flex */}
        <ArrowLeft className="w-4 h-4 mr-1" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-light">Back</span>
              <span className="font-semibold">Personal Details</span>
            </div>
          </div>
        </Button>
         <Button 
           type="button" 
          className="p-2 h-13 bg-[#8cc63f]  
           text-white rounded-md flex items-center justify-center gap-2" 
          size="lg" 
           
          disabled={isLoading}
        >
          <div className="flex items-center gap-2"> {/* flex-row is default for flex */}
         
            <div className="flex flex-col text-left">
              <span className="text-xs font-light">Next</span>
              <span className="font-semibold">Payment</span>
            </div>
             <GrLinkNext />
          </div>
        </Button>

          
      </div>
    </form>
  );
};