import { useEffect, useState } from "react";
import PhoneInput from "react-phone-input-2";
import "@/app/styles/phoneInput.css";
import { MESOMB_PHONE_COUNTRIES } from "@/lib/mesombCountries";
import { phoneToInputValue } from "@/lib/phoneNumber";

export type MesombPhoneCountryData = {
  countryCode?: string;
  dialCode?: string;
  name?: string;
};

type MesombPhoneInputProps = {
  value?: string;
  onChange: (value: string, data?: MesombPhoneCountryData) => void;
  country?: string;
  autoFocus?: boolean;
};

/** Même champ téléphone que CBC : uniquement les pays MeSomb, drapeau + indicatif. */
export function MesombPhoneInput({
  value,
  onChange,
  country = "cm",
  autoFocus = false,
}: MesombPhoneInputProps) {
  const requested = (country || "").toLowerCase();
  const iso = (MESOMB_PHONE_COUNTRIES as readonly string[]).includes(requested) ? requested : "cm";
  const [selectedCountry, setSelectedCountry] = useState(iso);

  useEffect(() => {
    setSelectedCountry(iso);
  }, [iso]);

  return (
    <PhoneInput
      country={selectedCountry}
      value={phoneToInputValue(value)}
      onChange={(nextValue, data) => {
        const nextIso =
          data && typeof data === "object" && "countryCode" in data
            ? String((data as MesombPhoneCountryData).countryCode || "").toLowerCase()
            : "";
        if (nextIso) setSelectedCountry(nextIso);
        onChange(
          nextValue,
          data && typeof data === "object" ? (data as MesombPhoneCountryData) : undefined,
        );
      }}
      enableLongNumbers
      enableSearch
      disableCountryGuess
      disableInitialCountryGuess
      countryCodeEditable={false}
      searchPlaceholder="Pays"
      onlyCountries={[...MESOMB_PHONE_COUNTRIES]}
      preferredCountries={["cm", "ci", "sn", "cd", "ga", "bj", "bf", "ke", "ug"]}
      inputProps={{
        name: "momo-phone",
        id: "momo-phone",
        required: false,
        autoFocus,
      }}
      containerClass="phone-container"
      inputClass="phone-input"
      dropdownClass="phone-dropdown !z-[80]"
    />
  );
}
