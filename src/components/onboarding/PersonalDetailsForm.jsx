import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GrLinkNext } from "react-icons/gr";

export const PersonalDetailsForm = ({
  formData,
  onChange,
  errors,
  isLoading,
  onSubmit,
}) => {
  const {
    firstName,
    surname,
    email,
    nationalId,
    kraPin,
    phone,
    occupation,
    address,
    termsAccepted,
  } = formData;

  const handleOccupationChange = (value) => {
    onChange('occupation', value);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="Enter first name"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surname">
            Surname <span className="text-destructive">*</span>
          </Label>
          <Input
            id="surname"
            value={surname}
            onChange={(e) => onChange('surname', e.target.value)}
            placeholder="Enter surname"
            disabled={isLoading}
          />
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
      <div className="space-y-2   ">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
        />
      </div>
        <div className="space-y-2    ">
          <Label htmlFor="nationalId">
            National ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nationalId"
            value={nationalId}
            onChange={(e) => onChange('nationalId', e.target.value)}
            placeholder="e.g., 41345678"
            disabled={isLoading}
            minLength={7}
            maxLength={8}
            className={`w-full  `}
          />
        </div>
        <div className="space-y-2  ">
          <Label htmlFor="kraPin">KRA PIN</Label>
          <Input
            id="kraPin"
            value={kraPin}
            onChange={(e) => onChange('kraPin', e.target.value)}
            placeholder="Enter KRA PIN"
            disabled={isLoading}
            minLength={11}
            maxLength={11}
          />
        </div>

      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="e.g., 0712345678"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Select value={occupation} onValueChange={handleOccupationChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select occupation" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Occupation</SelectLabel>
                <SelectItem value="Employed">Employed</SelectItem>
                <SelectItem value="Unemployed">Unemployed</SelectItem>
                <SelectItem value="Self-employed">Self-employed</SelectItem>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Physical Address</Label>
        <Textarea
          id="address"
          value={address}
          onChange={(e) => onChange('address', e.target.value)}
          placeholder="Enter your physical address"
          disabled={isLoading}
          rows={2}
        />
      </div>

      <div className="flex  justify-between">
        <div className="flex items-center space-x-3 pt-2">

        <Checkbox
          id="terms"
          checked={termsAccepted}
          className={`${termsAccepted ? 'bg-[#8cc63f]' : ''}   `}
          onCheckedChange={(checked) => onChange('termsAccepted', checked)}
         
          disabled={isLoading}
        />
        <Label htmlFor="terms" className="text-sm cursor-pointer">
          I confirm that the information provided is accurate and agree to the{' '}
          <span className="text-primary font-medium">Terms & Conditions</span>
        </Label>
         </div>
         <Button 
  type="submit" 
  className="p-2 h-13 bg-[#8cc63f]   text-white rounded-md flex items-center justify-center gap-2" 
  size="lg" 
  disabled={isLoading}
>
  <div className="flex items-center gap-2"> {/* flex-row is default for flex */}
    <div className="flex flex-col text-left">
      <span className="text-xs font-light">Next</span>
      <span className="font-semibold">Documents</span>
    </div>
    <GrLinkNext />
  </div>
</Button>
      </div>

{/*
      {errors.step1 && ( 
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errors.step1}</AlertDescription>
        </Alert>
      )}
*/}
  
    </form>
  );
};