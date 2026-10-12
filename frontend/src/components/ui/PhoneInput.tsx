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
};

export default function PhoneInput({
  value,
  onChange,
  country = "fr",
  autoFocus = false,
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
      preferredCountries={["fr", "be", "ca"]}
      inputProps={{
        name: "phone",
        id: "phone",
        required: false,
        autoFocus,
      }}
      containerClass="phone-container"
      inputClass="phone-input"
      dropdownClass="phone-dropdown"
    />
  );
}
