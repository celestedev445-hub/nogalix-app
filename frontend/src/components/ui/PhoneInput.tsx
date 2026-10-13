import { useEffect, useState } from "react";
import PhoneInputLib from "react-phone-input-2";
import { phoneToInputValue } from "@/lib/phoneNumber";
import "@/app/styles/phoneInput.css";

type CountryData = {
  countryCode?: string;
  dialCode?: string;
  name?: string;
};

type PhoneInputProps = {
  value?: string;
  onChange?: (value: string, data?: CountryData) => void;
  country?: string;
  autoFocus?: boolean;
  /** Identifiant du champ (relié au <Label htmlFor>). */
  id?: string;
  /** Limite la liste des pays (ex. pays couverts par le paiement Mobile Money). */
  onlyCountries?: string[];
  preferredCountries?: string[];
  /** Classe de la liste déroulante (z-index dans une modale, etc.). */
  dropdownClassName?: string;
};

export default function PhoneInput({
  value,
  onChange,
  country = "fr",
  autoFocus = false,
  id = "phone",
  onlyCountries,
  preferredCountries = ["fr", "be", "ca"],
  dropdownClassName,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState(country.toLowerCase());

  useEffect(() => {
    setSelectedCountry(country.toLowerCase());
  }, [country]);

  return (
    <PhoneInputLib
      country={selectedCountry}
      value={phoneToInputValue(value)}
      onChange={(nextValue, data) => {
        const nextIso =
          data && typeof data === "object" && "countryCode" in data
            ? String((data as CountryData).countryCode || "").toLowerCase()
            : "";
        if (nextIso) setSelectedCountry(nextIso);
        onChange?.(nextValue, data && typeof data === "object" ? (data as CountryData) : undefined);
      }}
      enableLongNumbers
      onlyCountries={onlyCountries}
      preferredCountries={preferredCountries}
      inputProps={{
        name: id,
        id,
        required: false,
        autoFocus,
      }}
      containerClass="phone-container"
      inputClass="phone-input"
      dropdownClass={dropdownClassName ? `phone-dropdown ${dropdownClassName}` : "phone-dropdown"}
    />
  );
}
