import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
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
import { useEffect, useMemo } from 'react';

// Kenyan counties and sub-counties data
const kenyaCounties = {
  "Mombasa": ["Changamwe", "Jomvu", "Kisauni", "Nyali", "Likoni", "Mvita"],
  "Kwale": ["Msambweni", "Lunga Lunga", "Matuga", "Kinango"],
  "Kilifi": ["Kilifi North", "Kilifi South", "Kaloleni", "Rabai", "Ganze", "Malindi", "Magarini"],
  "Tana River": ["Garsen", "Galole", "Bura"],
  "Lamu": ["Lamu East", "Lamu West"],
  "Taita Taveta": ["Taveta", "Wundanyi", "Mwatate", "Voi"],
  "Garissa": ["Garissa Township", "Balambala", "Lagdera", "Dadaab", "Fafi", "Ijara"],
  "Wajir": ["Wajir North", "Wajir East", "Wajir South", "Wajir West", "Eldas", "Tarbaj"],
  "Mandera": ["Mandera North", "Mandera East", "Mandera South", "Mandera West", "Lafey"],
  "Marsabit": ["Moyale", "North Horr", "Saku", "Laisamis"],
  "Isiolo": ["Isiolo North", "Isiolo South"],
  "Meru": ["Igembe North", "Igembe Central", "Igembe South", "Tigania East", "Tigania West", "North Imenti", "Buuri", "Central Imenti", "South Imenti"],
  "Tharaka Nithi": ["Maara", "Chuka/Igambang'ombe", "Tharaka"],
  "Embu": ["Manyatta", "Runyenjes", "Mbeere North", "Mbeere South"],
  "Kitui": ["Mwingi North", "Mwingi Central", "Mwingi West", "Kitui East", "Kitui South", "Kitui Rural", "Kitui Central"],
  "Machakos": ["Masinga", "Yatta", "Kangundo", "Matungulu", "Kathiani", "Mavoko", "Machakos Town", "Mwala"],
  "Makueni": ["Kibwezi East", "Kibwezi West", "Makueni", "Kilome", "Kaiti", "Mbooni"],
  "Nyandarua": ["Kinangop", "Kipipiri", "Ol Kalou", "Ol Jorok", "Ndaragwa"],
  "Nyeri": ["Tetu", "Kieni", "Mathira", "Othaya", "Mukurweini", "Nyeri Town"],
  "Kirinyaga": ["Mwea", "Gichugu", "Ndia", "Kirinyaga Central"],
  "Murang'a": ["Kangema", "Mathioya", "Kiharu", "Kigumo", "Maragua", "Kandara", "Gatanga"],
  "Kiambu": ["Gatundu North", "Gatundu South", "Juja", "Thika Town", "Ruiru", "Githunguri", "Kiambu", "Kiambaa", "Kabete", "Kikuyu", "Limuru", "Lari"],
  "Turkana": ["Turkana North", "Turkana West", "Turkana Central", "Loima", "Turkana South", "Turkana East"],
  "West Pokot": ["Kapenguria", "Sigor", "Kacheliba", "Pokot South"],
  "Samburu": ["Samburu North", "Samburu West", "Samburu East"],
  "Trans Nzoia": ["Kwanza", "Endebess", "Saboti", "Kiminini", "Cherangany"],
  "Uasin Gishu": ["Soy", "Turbo", "Moiben", "Ainabkoi", "Kapseret", "Kesses"],
  "Elgeyo Marakwet": ["Marakwet East", "Marakwet West", "Keiyo North", "Keiyo South"],
  "Nandi": ["Tinderet", "Aldai", "Nandi Hills", "Chesumei", "Emgwen", "Mosop"],
  "Baringo": ["Tiaty", "Baringo North", "Baringo Central", "Baringo South", "Mogotio", "Eldama Ravine"],
  "Laikipia": ["Laikipia North", "Laikipia East", "Laikipia West", "Nyandarua North", "Nyandarua South"],
  "Nakuru": ["Naivasha", "Gilgil", "Bahati", "Nakuru Town East", "Nakuru Town West", "Njoro", "Molo", "Rongai", "Subukia", "Kuresoi North", "Kuresoi South"],
  "Narok": ["Kilgoris", "Emurua Dikirr", "Narok North", "Narok East", "Narok South", "Narok West"],
  "Kajiado": ["Kajiado North", "Kajiado Central", "Kajiado East", "Kajiado West", "Kajiado South"],
  "Kericho": ["Kipkelion East", "Kipkelion West", "Ainamoi", "Bureti", "Belgut", "Sigowet/Soin"],
  "Bomet": ["Bomet East", "Bomet Central", "Bomet West", "Chepalungu", "Sotik", "Konoin"],
  "Kakamega": ["Lugari", "Likuyani", "Malava", "Lurambi", "Navakholo", "Mumias West", "Mumias East", "Matungu", "Butere", "Khwisero", "Shinyalu", "Ikolomani"],
  "Vihiga": ["Vihiga", "Sabatia", "Hamisi", "Luanda", "Emuhaya"],
  "Bungoma": ["Mt Elgon", "Sirisia", "Kabuchai", "Bumula", "Kanduyi", "Webuye East", "Webuye West", "Kimilili", "Tongaren"],
  "Busia": ["Teso North", "Teso South", "Nambale", "Matayos", "Butula", "Funyula", "Budalangi"],
  "Siaya": ["Ugenya", "Ugunja", "Alego Usonga", "Gem", "Bondo", "Rarieda"],
  "Kisumu": ["Kisumu East", "Kisumu West", "Kisumu Central", "Seme", "Nyando", "Muhoroni", "Nyakach"],
  "Homa Bay": ["Kasipul", "Kabondo", "Karachuonyo", "Rangwe", "Homa Bay Town", "Ndhiwa", "Suba North", "Suba South"],
  "Migori": ["Rongo", "Awendo", "Suna East", "Suna West", "Uriri", "Nyatike", "Kuria East", "Kuria West"],
  "Kisii": ["Bonchari", "South Mugirango", "Bomachoge Borabu", "Bobasi", "Bomachoge Chache", "Nyaribari Masaba", "Nyaribari Chache", "Kitutu Chache North", "Kitutu Chache South"],
  "Nyamira": ["Kitutu Masaba", "North Mugirango", "West Mugirango", "Borabu", "Nyamira North", "Nyamira South"],
  "Nairobi": ["Westlands", "Dagoretti North", "Dagoretti South", "Lang'ata", "Kibra", "Roysambu", "Kasarani", "Ruaraka", "Embakasi South", "Embakasi North", "Embakasi Central", "Embakasi East", "Embakasi West", "Makadara", "Kamukunji", "Starehe", "Mathare"]
};

export const PersonalDetailsForm = ({
  formData,
  onChange,
  errors,
  isLoading,
  onSubmit,
}) => {
  const {
    firstName,
    secondName,
    surname,
    email,
    nationalId,
    kraPin,
    phone,
    occupation,
    poBox,
    county,
    subCounty,
    termsAccepted,
  } = formData;

  const subCountiesList = useMemo(() => {
    return county && kenyaCounties[county] ? kenyaCounties[county] : [];
  }, [county]);

  // Update sub-counties when county changes
  useEffect(() => {
    if (subCounty && !subCountiesList.includes(subCounty)) {
      onChange('subCounty', '');
    }
  }, [onChange, subCounty, subCountiesList]);

  // Handle numeric input for phone and nationalId
  const handleNumericChange = (field, value) => {
    const numericValue = value.replace(/\D/g, '');
    onChange(field, numericValue);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondName">
            Second Name
          </Label>
          <Input
            id="secondName"
            value={secondName}
            onChange={(e) => onChange('secondName', e.target.value)}
            placeholder="Enter second name"
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
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2"  >
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
          
            id="email"
            type="email"
            value={email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="you@example.com"
            disabled 
            required
             
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationalId">
            National ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nationalId"
            value={nationalId}
            onChange={(e) => handleNumericChange('nationalId', e.target.value)}
            placeholder="e.g., 41345678"
            disabled={isLoading}
            minLength={7}
            maxLength={8}
            inputMode="numeric"
            pattern="\d*"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kraPin">KRA PIN</Label>
          <Input
            id="kraPin"
            value={kraPin}
            onChange={(e) => onChange('kraPin', e.target.value.toUpperCase())}
            placeholder="Enter KRA PIN"
            disabled={isLoading}
            minLength={11}
            maxLength={11}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => handleNumericChange('phone', e.target.value)}
            placeholder="e.g., 0712345678"
            disabled={isLoading}
            inputMode="numeric"
            pattern="\d*"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Select value={occupation} onValueChange={(value) => onChange('occupation', value)}>
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
        {/* PO Box Field */}
        <div className="space-y-2">
          <Label htmlFor="poBox">
            Physical Address (PO Box) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="poBox"
            value={poBox}
            onChange={(e) => onChange('poBox', e.target.value)}
            placeholder="e.g., P.O. Box 12345-00100"
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* County and Sub-County */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="county">
            County <span className="text-destructive">*</span>
          </Label>
          <Select value={county} onValueChange={(value) => onChange('county', value)} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your county" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Counties</SelectLabel>
                {Object.keys(kenyaCounties).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subCounty">
            Sub-County <span className="text-destructive">*</span>
          </Label>
          <Select
            value={subCounty}
            onValueChange={(value) => onChange('subCounty', value)}
            disabled={!county}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={county ? "Select sub-county" : "Select county first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sub-Counties</SelectLabel>
                {subCountiesList.map((sc) => (
                  <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Terms and Submit */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => onChange('termsAccepted', checked)}
            disabled={isLoading}
            required
          />
          <Label htmlFor="terms" className="text-sm cursor-pointer">
            I confirm that the information provided is accurate and agree to the{' '}
            <span className="text-primary font-medium">Terms & Conditions</span>
          </Label>
        </div>
      </div>
      <Button
        type="submit"
        className="p-2 h-13 w-5 bg-[#8cc63f] text-white rounded-md flex items-center justify-center gap-2"
        disabled={isLoading || !termsAccepted}
      >
        <div className="flex flex-col text-left">
          <span className="text-xs font-light">Next</span>
          <span className="font-semibold leading-tight">Upload Documents</span>
        </div>
        <GrLinkNext />
      </Button>
    </form>
  );
};
